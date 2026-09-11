const axios = require('axios');

const PHOTON_URL = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NER-SmartLogix/2.0 (logistics accessibility & safety platform)';

const http = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
});

// In-memory cache for geocoding, suggestions and facilities
const cache = {
  geocode: new Map(),
  suggest: new Map(),
  reverse: new Map(),
  facilities: new Map()
};

function parseCoordinates(str) {
  if (typeof str !== 'string') return null;
  const match = str.trim().match(/^([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[3]);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
  return null;
}

/**
 * Geocode place name into coordinates using Photon (OSM-based) with coordinate detection and caching.
 */
async function geocode(place) {
  if (!place) throw new Error('Location is required.');
  
  // 1. Direct coordinate string check
  const coord = parseCoordinates(place);
  if (coord) return coord;

  const key = place.trim().toLowerCase();
  if (cache.geocode.has(key)) return cache.geocode.get(key);

  try {
    const response = await http.get(PHOTON_URL, {
      params: { q: `${place}, India`, limit: 1, lang: 'en' }
    });
    const feature = response.data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (coordinates && coordinates.length >= 2) {
      const result = {
        lat: coordinates[1],
        lng: coordinates[0],
        name: feature.properties?.name || place,
        label: [feature.properties?.name, feature.properties?.city || feature.properties?.district, feature.properties?.state]
          .filter(Boolean).join(', ') || place
      };
      cache.geocode.set(key, result);
      return result;
    }
  } catch (err) {
    console.warn('[OSM Geocode] Photon error:', err.message);
  }

  // Fallback to direct Photon search without appended country
  try {
    const response = await http.get(PHOTON_URL, {
      params: { q: place, limit: 1, lang: 'en' }
    });
    const feature = response.data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (coordinates && coordinates.length >= 2) {
      const result = {
        lat: coordinates[1],
        lng: coordinates[0],
        name: feature.properties?.name || place,
        label: [feature.properties?.name, feature.properties?.city, feature.properties?.state]
          .filter(Boolean).join(', ') || place
      };
      cache.geocode.set(key, result);
      return result;
    }
  } catch (_) {}

  throw new Error(`Could not find location for "${place}". Please check the spelling or enter coordinates.`);
}

/**
 * Autocomplete suggestions for locations in India using Photon (OSM data).
 */
async function suggest(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  if (cache.suggest.has(q)) return cache.suggest.get(q);

  try {
    const response = await http.get(PHOTON_URL, {
      params: {
        q: query,
        limit: 6,
        lang: 'en',
        lat: 26.14,
        lon: 91.74 // Bias towards North Eastern Region / India
      }
    });

    const suggestions = (response.data?.features || []).map(f => {
      const coords = f.geometry?.coordinates || [];
      const p = f.properties || {};
      const parts = [p.name, p.street, p.city || p.district, p.state, p.country].filter(Boolean);
      return {
        name: p.name || query,
        city: p.city || p.district || '',
        state: p.state || '',
        label: parts.join(', '),
        lat: coords[1],
        lng: coords[0]
      };
    }).filter(s => s.lat && s.lng);

    cache.suggest.set(q, suggestions);
    return suggestions;
  } catch (err) {
    console.warn('[OSM Suggest] error:', err.message);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable address.
 */
async function reverseGeocode(lat, lng) {
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (cache.reverse.has(key)) return cache.reverse.get(key);

  // Try Photon reverse first
  try {
    const resp = await http.get(PHOTON_REVERSE_URL, {
      params: { lat, lon: lng }
    });
    const feature = resp.data?.features?.[0];
    if (feature?.properties) {
      const p = feature.properties;
      const label = [p.name, p.street, p.city || p.district, p.state].filter(Boolean).join(', ');
      if (label) {
        const result = { label, name: p.name || label, city: p.city || '', state: p.state || '' };
        cache.reverse.set(key, result);
        return result;
      }
    }
  } catch (_) {}

  // Fallback to Nominatim reverse
  try {
    const resp = await http.get(NOMINATIM_REVERSE_URL, {
      params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 }
    });
    if (resp.data) {
      const label = resp.data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const result = { label, name: resp.data.name || label };
      cache.reverse.set(key, result);
      return result;
    }
  } catch (_) {}

  return { label: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` };
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr ${remainder} min` : `${remainder} min`;
}

function formatStep(step) {
  const maneuver = step.maneuver || {};
  const modifier = maneuver.modifier ? maneuver.modifier.replace('-', ' ') : '';
  const action = maneuver.type === 'depart'
    ? 'Depart'
    : maneuver.type === 'arrive'
    ? 'Arrive at destination'
    : `${maneuver.type === 'continue' ? 'Continue' : maneuver.type.replace('-', ' ')}${modifier ? ` ${modifier}` : ''}`;
  const road = step.name ? ` onto ${step.name}` : '';
  const distance = step.distance >= 1000
    ? `${(step.distance / 1000).toFixed(1)} km`
    : `${Math.round(step.distance || 0)} m`;
  return `${distance} — ${action}${road}`;
}

function routeToResult(route, index, origin, destination, originPoint, destinationPoint, vehicleType) {
  return {
    index,
    summary: index === 0 ? 'Direct Highway Corridor' : `Alternative Road Corridor ${index + 1}`,
    distance: `${(route.distance / 1000).toFixed(1)} km`,
    distanceValue: Math.round(route.distance),
    duration: formatDuration(route.duration),
    durationValue: Math.round(route.duration),
    durationInTraffic: null,
    startAddress: originPoint.label || origin,
    endAddress: destinationPoint.label || destination,
    origin: originPoint,
    destination: destinationPoint,
    geometry: route.geometry,
    steps: (route.legs?.[0]?.steps || []).map(formatStep).slice(0, 30),
    vehicleType,
    warnings: ['Standard road routing via OpenStreetMap / OSRM.']
  };
}

/**
 * Calculate driving routes using OSRM.
 */
async function getRoutes(origin, destination, vehicleType = 'Truck') {
  const [originPoint, destinationPoint] = await Promise.all([geocode(origin), geocode(destination)]);
  const response = await http.get(`${OSRM_URL}/${originPoint.lng},${originPoint.lat};${destinationPoint.lng},${destinationPoint.lat}`, {
    params: { overview: 'full', geometries: 'geojson', alternatives: 'true', steps: 'true' }
  });

  if (response.data?.code !== 'Ok' || !response.data.routes?.length) {
    throw new Error('No drivable road route was found between those locations.');
  }

  return response.data.routes.slice(0, 2).map((route, index) =>
    routeToResult(route, index, origin, destination, originPoint, destinationPoint, vehicleType)
  );
}

/**
 * Calculate multi-stop detour route: Origin -> Waypoint Facility -> Destination.
 */
async function getWaypointRoute(origin, waypoint, destination, vehicleType = 'Truck') {
  const [originPoint, waypointPoint, destinationPoint] = await Promise.all([
    geocode(origin),
    typeof waypoint === 'object' && waypoint.lat ? waypoint : geocode(waypoint),
    geocode(destination)
  ]);

  const coords = `${originPoint.lng},${originPoint.lat};${waypointPoint.lng},${waypointPoint.lat};${destinationPoint.lng},${destinationPoint.lat}`;
  const response = await http.get(`${OSRM_URL}/${coords}`, {
    params: { overview: 'full', geometries: 'geojson', steps: 'true' }
  });

  if (response.data?.code !== 'Ok' || !response.data.routes?.length) {
    throw new Error('Could not calculate multi-stop route via facility.');
  }

  const route = response.data.routes[0];
  const leg1 = route.legs?.[0] || {};
  const leg2 = route.legs?.[1] || {};

  return {
    summary: `Route via ${waypointPoint.name || 'Facility'}`,
    distance: `${(route.distance / 1000).toFixed(1)} km`,
    distanceValue: Math.round(route.distance),
    duration: formatDuration(route.duration),
    durationValue: Math.round(route.duration),
    origin: originPoint,
    waypoint: waypointPoint,
    destination: destinationPoint,
    geometry: route.geometry,
    legs: [
      { distance: `${((leg1.distance || 0) / 1000).toFixed(1)} km`, duration: formatDuration(leg1.duration || 0) },
      { distance: `${((leg2.distance || 0) / 1000).toFixed(1)} km`, duration: formatDuration(leg2.duration || 0) }
    ],
    steps: [...(leg1.steps || []), ...(leg2.steps || [])].map(formatStep).slice(0, 30),
    vehicleType
  };
}

/**
 * Known regional bypass and alternate corridors across the North Eastern Region.
 * When a primary hill/river highway has HIGH risk (severe rain/landslides/floods),
 * these provide safer alternate logistics corridors.
 */
const NER_CORRIDOR_BYPASSES = [
  // Guwahati <-> Shillong / Meghalaya
  {
    matches: (o, d) => (
      (o.lat > 25.9 && o.lat < 26.4 && o.lng > 91.5 && o.lng < 92.0 && d.lat > 25.3 && d.lat < 25.8 && d.lng > 91.6 && d.lng < 92.1) ||
      (d.lat > 25.9 && d.lat < 26.4 && d.lng > 91.5 && d.lng < 92.0 && o.lat > 25.3 && o.lat < 25.8 && o.lng > 91.6 && o.lng < 92.1)
    ),
    waypoints: [
      { name: 'Western Meghalaya Bypass (via Boko / Nongstoin)', lat: 25.52, lng: 91.267 },
      { name: 'Mairang Bypass Corridor', lat: 25.56, lng: 91.63 },
      { name: 'East Meghalaya Corridor (via Jowai)', lat: 25.44, lng: 92.21 }
    ]
  },
  // Guwahati <-> Silchar / Barak Valley
  {
    matches: (o, d) => (
      (o.lat > 25.9 && o.lat < 26.4 && d.lat > 24.6 && d.lat < 25.0 && d.lng > 92.6 && d.lng < 93.1) ||
      (d.lat > 25.9 && d.lat < 26.4 && o.lat > 24.6 && o.lat < 25.0 && o.lng > 92.6 && o.lng < 93.1)
    ),
    waypoints: [
      { name: 'Haflong Hill Corridor (NH-27 / NH-54)', lat: 25.17, lng: 93.02 },
      { name: 'Jowai Escarpment Route (NH-6)', lat: 25.44, lng: 92.21 }
    ]
  },
  // Guwahati <-> Tezpur / Upper Assam
  {
    matches: (o, d) => (
      (o.lat > 25.9 && o.lat < 26.4 && d.lat > 26.5 && d.lat < 27.0 && d.lng > 92.6 && d.lng < 93.2) ||
      (d.lat > 25.9 && d.lat < 26.4 && o.lat > 26.5 && o.lat < 27.0 && o.lng > 92.6 && o.lng < 93.2)
    ),
    waypoints: [
      { name: 'North Bank Highway (NH-15 via Mangaldai)', lat: 26.44, lng: 92.03 },
      { name: 'South Bank Highway (NH-715 via Nagaon)', lat: 26.35, lng: 92.68 }
    ]
  },
  // Silchar <-> Imphal
  {
    matches: (o, d) => (
      (o.lat > 24.6 && o.lat < 25.0 && d.lat > 24.6 && d.lat < 25.1 && d.lng > 93.8 && d.lng < 94.1) ||
      (d.lat > 24.6 && d.lat < 25.0 && o.lat > 24.6 && o.lat < 25.1 && o.lng > 93.8 && o.lng < 94.1)
    ),
    waypoints: [
      { name: 'North Kohima / Senapati Bypass', lat: 25.67, lng: 94.11 },
      { name: 'Churachandpur Southern Corridor', lat: 24.33, lng: 93.67 }
    ]
  }
];

/**
 * Searches and generates a safer alternate road route using intermediate corridor waypoints
 * when the primary route has elevated/high risk.
 */
async function findAlternateSafetyRoute({
  origin,
  destination,
  originPoint,
  destinationPoint,
  vehicleType = 'Truck',
  primaryRoute,
  primaryRiskScore = 50
}) {
  if (!originPoint || !destinationPoint) return null;

  const primaryDist = primaryRoute?.distanceValue || 1;
  const candidateWaypoints = [];

  // 1. Check known NER regional corridor bypasses
  for (const corridor of NER_CORRIDOR_BYPASSES) {
    if (corridor.matches(originPoint, destinationPoint)) {
      candidateWaypoints.push(...corridor.waypoints);
    }
  }

  // 2. Generate lateral geometric offset waypoints (works anywhere)
  const dx = destinationPoint.lng - originPoint.lng;
  const dy = destinationPoint.lat - originPoint.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0.15) {
    const nx = -dy / dist;
    const ny = dx / dist;
    const factors = [0.25, -0.25, 0.40, -0.40, 0.15, -0.15];
    for (const factor of factors) {
      candidateWaypoints.push({
        name: factor > 0 ? 'Safety Bypass Detour (East/North Corridor)' : 'Safety Bypass Detour (West/South Corridor)',
        lng: Number((originPoint.lng + dx * 0.5 + nx * dist * factor).toFixed(4)),
        lat: Number((originPoint.lat + dy * 0.5 + ny * dist * factor).toFixed(4))
      });
    }
  }

  if (!candidateWaypoints.length) return null;

  const routeRiskML = require('./routeRiskML');
  const validCandidates = [];

  // Query OSRM for candidate detour routes (fast parallel road-snapped check)
  const candidatesToTest = candidateWaypoints.slice(0, 2);
  const candidateRoutes = [];

  await Promise.allSettled(
    candidatesToTest.map(async (wp) => {
      try {
        const coords = `${originPoint.lng},${originPoint.lat};${wp.lng},${wp.lat};${destinationPoint.lng},${destinationPoint.lat}`;
        const resp = await http.get(`${OSRM_URL}/${coords}`, {
          params: { overview: 'full', geometries: 'geojson', steps: 'true' },
          timeout: 4000
        });

        if (resp.data?.code !== 'Ok' || !resp.data.routes?.length) return;
        const osrmRoute = resp.data.routes[0];

        // Ensure candidate is a genuine detour (different distance and not ridiculously long)
        const candDist = osrmRoute.distance;
        if (Math.abs(candDist - primaryDist) < 5000) return; // Must differ by at least 5 km
        if (candDist > primaryDist * 3.5) return; // Must not exceed 3.5x primary distance

        candidateRoutes.push({
          wp,
          osrmRoute,
          distanceRatio: candDist / primaryDist
        });
      } catch (e) {
        // Candidate query failed; ignore
      }
    })
  );

  if (!candidateRoutes.length) return null;

  // Pick the best candidate detour
  const chosen = candidateRoutes[0];
  const { wp, osrmRoute } = chosen;

  const altRouteObj = {
    index: 1,
    summary: `Alternate Safety Bypass (${wp.name})`,
    distance: `${(osrmRoute.distance / 1000).toFixed(1)} km`,
    distanceValue: Math.round(osrmRoute.distance),
    duration: formatDuration(osrmRoute.duration),
    durationValue: Math.round(osrmRoute.duration),
    durationInTraffic: null,
    startAddress: originPoint.label || origin,
    endAddress: destinationPoint.label || destination,
    origin: originPoint,
    destination: destinationPoint,
    geometry: osrmRoute.geometry,
    steps: (osrmRoute.legs?.[0]?.steps || []).map(formatStep).slice(0, 30),
    vehicleType,
    isAlternateSafetyRoute: true,
    warnings: ['Alternate corridor evaluated to avoid high-hazard primary corridor.']
  };

  try {
    // Score chosen candidate with ML risk engine
    const riskResult = await routeRiskML.analyzeRouteRisk({
      route: altRouteObj,
      origin,
      destination,
      vehicleType
    });

    if (riskResult && riskResult.success) {
      const riskObj = {
        risk: riskResult.overall.level,
        score: riskResult.overall.score,
        overall: riskResult.overall,
        factors: riskResult.factors,
        segments: riskResult.segments,
        metadata: riskResult.metadata || {},
        recommendation: riskResult.overall.recommendation,
        confidence: Number((riskResult.overall.confidencePct / 100).toFixed(2)),
        confidencePct: riskResult.overall.confidencePct,
        keyFactors: riskResult.overall.keyFactors,
        scoringVersion: 'ml-route-risk-v2'
      };

      return {
        ...altRouteObj,
        risk: riskObj,
        isRecommendedForSafety: riskResult.overall.score < primaryRiskScore
      };
    }
  } catch (scoreErr) {
    console.warn('[OSM Alternate] Risk scoring fallback:', scoreErr.message);
  }

  return altRouteObj;
}

function elementPoint(element) {
  return element.type === 'node'
    ? [element.lat, element.lon]
    : [element.center?.lat, element.center?.lon];
}

// Spherical distance approximation in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Searches facilities along the route corridor using Overpass API.
 * Uses a route bounding box query — one efficient request covering all facility types.
 *
 * @param {string} origin - Origin place name
 * @param {string} destination - Destination place name
 * @param {string[]} types - Facility type filters
 * @param {Array} routeCoords - GeoJSON [lng,lat] coordinate array from OSRM geometry (up to 20 thinned points)
 */
async function getFacilitiesAlongRoute(origin, destination, types = [
  'hospital', 'pharmacy', 'police', 'gas_station', 'lodging', 'car_repair', 'parking', 'restaurant', 'restroom'
], routeCoords = [], options = {}) {
  const userLoc = options.userLocation || null;
  const userLocKey = userLoc ? `${Number(userLoc.lat).toFixed(2)},${Number(userLoc.lng).toFixed(2)}` : '';
  const cacheKey = `${origin}->${destination}->${[...types].sort().join(',')}->${userLocKey}`;
  if (cache.facilities.has(cacheKey)) {
    return cache.facilities.get(cacheKey);
  }

  const allCoords = routeCoords && routeCoords.length >= 2 ? routeCoords : [];

  let originPoint = options.originCoords && options.originCoords.lat ? options.originCoords : null;
  let destinationPoint = options.destinationCoords && options.destinationCoords.lat ? options.destinationCoords : null;

  if (!originPoint || !destinationPoint) {
    try {
      const [o, d] = await Promise.all([
        originPoint ? Promise.resolve(originPoint) : geocode(origin),
        destinationPoint ? Promise.resolve(destinationPoint) : geocode(destination)
      ]);
      if (!originPoint) originPoint = o;
      if (!destinationPoint) destinationPoint = d;
    } catch (gErr) {
      if (allCoords.length >= 2) {
        originPoint = { lat: allCoords[0][1], lng: allCoords[0][0], label: origin };
        destinationPoint = { lat: allCoords[allCoords.length - 1][1], lng: allCoords[allCoords.length - 1][0], label: destination };
      } else {
        throw gErr;
      }
    }
  }

  // --- Compute bounding box from route geometry or fallback to O/D points ---
  let minLat, maxLat, minLng, maxLng;

  if (allCoords.length >= 2) {
    minLat = Math.min(...allCoords.map(c => c[1]));
    maxLat = Math.max(...allCoords.map(c => c[1]));
    minLng = Math.min(...allCoords.map(c => c[0]));
    maxLng = Math.max(...allCoords.map(c => c[0]));
  } else {
    minLat = Math.min(originPoint.lat, destinationPoint.lat);
    maxLat = Math.max(originPoint.lat, destinationPoint.lat);
    minLng = Math.min(originPoint.lng, destinationPoint.lng);
    maxLng = Math.max(originPoint.lng, destinationPoint.lng);
  }

  // If user GPS is provided, make sure bbox covers user position
  if (userLoc && userLoc.lat && userLoc.lng) {
    minLat = Math.min(minLat, userLoc.lat);
    maxLat = Math.max(maxLat, userLoc.lat);
    minLng = Math.min(minLng, userLoc.lng);
    maxLng = Math.max(maxLng, userLoc.lng);
  }

  // Expand bbox by ~15 km on each side (0.14 degrees ≈ 15 km)
  const PAD = 0.14;
  const bbox = `${(minLat - PAD).toFixed(5)},${(minLng - PAD).toFixed(5)},${(maxLat + PAD).toFixed(5)},${(maxLng + PAD).toFixed(5)}`;

  // Keep a reference centroid list for distance computation (route sample points or O/D)
  const refPoints = allCoords.length >= 2
    ? allCoords.map(c => [c[1], c[0]])
    : [[originPoint.lat, originPoint.lng], [destinationPoint.lat, destinationPoint.lng]];

  // Filter out ATM — explicitly excluded as requested
  const wanted = new Set(types.filter(t => t !== 'atm'));

  // Build ONE bounding-box Overpass query with all facility types (excluding ATM)
  const clauses = [];
  if (wanted.has('hospital'))    clauses.push('nwr["amenity"~"hospital|clinic"]');
  if (wanted.has('pharmacy'))    clauses.push('nwr["amenity"="pharmacy"]', 'nwr["healthcare"="pharmacy"]', 'nwr["shop"="chemist"]');
  if (wanted.has('police'))      clauses.push('nwr["amenity"="police"]');
  if (wanted.has('gas_station')) clauses.push('nwr["amenity"="fuel"]');
  if (wanted.has('lodging'))     clauses.push('nwr["tourism"~"hotel|motel|guest_house|hostel"]');
  if (wanted.has('car_repair'))  clauses.push('nwr["shop"~"car_repair|tyres"]', 'nwr["craft"="car_repair"]');
  if (wanted.has('parking'))     clauses.push('nwr["amenity"="parking"]', 'nwr["highway"="rest_area"]');
  if (wanted.has('restaurant'))  clauses.push('nwr["amenity"~"restaurant|fast_food|cafe"]');
  if (wanted.has('restroom'))    clauses.push('nwr["amenity"="toilets"]');

  if (!clauses.length) return [];

  // Single compact bbox query — fast and covers corridor
  const query = `[out:json][timeout:25];(${clauses.map(c => `${c}(${bbox});`).join('')});out center tags;`;

  const defaultNames = {
    hospital:    'Hospital / Health Center',
    pharmacy:    'Pharmacy / Medical Store',
    police:      'Police Station / Outpost',
    gas_station: 'Petrol Pump',
    lodging:     'Hotel / Lodge',
    car_repair:  'Auto Repair / Garage',
    parking:     'Parking Facility',
    restaurant:  'Restaurant / Dhaba',
    restroom:    'Public Restroom'
  };

  function classifyElement(tags) {
    if (['hospital', 'clinic'].includes(tags.amenity)) return 'hospital';
    if (tags.amenity === 'pharmacy' || tags.healthcare === 'pharmacy' || tags.shop === 'chemist') return 'pharmacy';
    if (tags.amenity === 'police') return 'police';
    if (tags.amenity === 'fuel') return 'gas_station';
    if (tags.shop === 'car_repair' || tags.shop === 'tyres' || tags.craft === 'car_repair') return 'car_repair';
    if (tags.amenity === 'parking' || tags.highway === 'rest_area') return 'parking';
    if (['restaurant', 'fast_food', 'cafe'].includes(tags.amenity)) return 'restaurant';
    if (tags.amenity === 'toilets') return 'restroom';
    if (tags.tourism) return 'lodging';
    return null;
  }

  function minDistToRoute(lat, lng) {
    let min = Infinity;
    for (const [rLat, rLng] of refPoints) {
      const d = distanceMeters(lat, lng, rLat, rLng);
      if (d < min) min = d;
    }
    return min;
  }

  try {
    const response = await http.post(OVERPASS_URL, query, { headers: { 'Content-Type': 'text/plain' } });
    const elements = response.data?.elements || [];

    const seen = new Set();
    const typeCount = {};
    const PER_TYPE_MAX = 8;

    const facilities = [];
    const sorted = elements
      .map(el => {
        const point = elementPoint(el);
        if (!point[0] || !point[1]) return null;
        const tags = el.tags || {};
        const facilityType = classifyElement(tags);
        if (!facilityType || !wanted.has(facilityType)) return null;
        const dist = minDistToRoute(point[0], point[1]);
        const distFromUser = (userLoc && userLoc.lat && userLoc.lng)
          ? distanceMeters(point[0], point[1], userLoc.lat, userLoc.lng)
          : null;
        const address = [tags['addr:street'], tags['addr:city'] || tags['addr:district'], tags['addr:postcode']]
          .filter(Boolean).join(', ');
        return {
          id: `${el.type}/${el.id}`,
          placeId: `${el.type}/${el.id}`,
          name: tags.name || tags.brand || tags.operator || defaultNames[facilityType],
          brand: tags.brand || tags.operator || null,
          facilityType,
          address: address || 'Along Logistics Highway',
          coordinates: { lat: point[0], lng: point[1] },
          distanceMeters: dist,
          distanceFromUser: distFromUser,
          openingHours: tags.opening_hours || null,
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          source: 'OpenStreetMap'
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.distanceFromUser != null && b.distanceFromUser != null) {
          return a.distanceFromUser - b.distanceFromUser;
        }
        return a.distanceMeters - b.distanceMeters;
      });

    for (const item of sorted) {
      if (seen.has(item.placeId)) continue;
      typeCount[item.facilityType] = (typeCount[item.facilityType] || 0);
      if (typeCount[item.facilityType] >= PER_TYPE_MAX) continue;
      seen.add(item.placeId);
      typeCount[item.facilityType]++;
      facilities.push(item);
    }

    if (facilities.length > 0) {
      facilities.sort((a, b) => {
        if (a.distanceFromUser != null && b.distanceFromUser != null) {
          return a.distanceFromUser - b.distanceFromUser;
        }
        return a.distanceMeters - b.distanceMeters;
      });
      cache.facilities.set(cacheKey, facilities);
      return facilities;
    }
  } catch (err) {
    console.warn('[Overpass] bbox query failed:', err.message);
  }

  // --- Fallback: parallel Photon searches per facility type (excluding ATM) ---
  try {
    const midLat = userLoc && userLoc.lat ? (userLoc.lat + destinationPoint.lat) / 2 : (originPoint.lat + destinationPoint.lat) / 2;
    const midLng = userLoc && userLoc.lng ? (userLoc.lng + destinationPoint.lng) / 2 : (originPoint.lng + destinationPoint.lng) / 2;

    const photonSearches = [
      { q: 'hospital clinic', type: 'hospital', name: 'Hospital' },
      { q: 'pharmacy chemist medical', type: 'pharmacy', name: 'Pharmacy' },
      { q: 'police station thana outpost', type: 'police', name: 'Police Station' },
      { q: 'fuel petrol diesel', type: 'gas_station', name: 'Petrol Pump' },
      { q: 'hotel lodge guest house', type: 'lodging', name: 'Hotel / Lodge' },
      { q: 'car repair garage mechanic', type: 'car_repair', name: 'Garage / Repair' },
      { q: 'restaurant dhaba food', type: 'restaurant', name: 'Restaurant / Dhaba' },
      { q: 'parking truck rest', type: 'parking', name: 'Parking' },
      { q: 'public toilet restroom', type: 'restroom', name: 'Public Restroom' }
    ].filter(s => wanted.has(s.type));

    const seenFallback = new Set();
    const fallbackResults = [];

    await Promise.allSettled(photonSearches.map(async sq => {
      try {
        const resp = await http.get(PHOTON_URL, {
          params: { q: sq.q, lat: midLat, lon: midLng, limit: 8, lang: 'en' }
        });
        (resp.data?.features || []).forEach(f => {
          const coords = f.geometry?.coordinates || [];
          const p = f.properties || {};
          if (coords.length >= 2 && p.name) {
            const lat = coords[1], lng = coords[0];
            const id = `photon/${p.osm_id || Math.random().toString(36).slice(2)}`;
            if (!seenFallback.has(id)) {
              seenFallback.add(id);
              const dist = minDistToRoute(lat, lng);
              const distFromUser = (userLoc && userLoc.lat && userLoc.lng)
                ? distanceMeters(lat, lng, userLoc.lat, userLoc.lng)
                : null;
              if (dist <= 50000) {
                const address = [p.street, p.city || p.district, p.state].filter(Boolean).join(', ');
                fallbackResults.push({
                  id, placeId: id,
                  name: p.name || sq.name,
                  brand: null,
                  facilityType: sq.type,
                  address: address || 'Along Highway Corridor',
                  coordinates: { lat, lng },
                  distanceMeters: dist,
                  distanceFromUser: distFromUser,
                  openingHours: null, phone: null, website: null,
                  source: 'OpenStreetMap'
                });
              }
            }
          }
        });
      } catch (_) {}
    }));

    if (fallbackResults.length > 0) {
      fallbackResults.sort((a, b) => {
        if (a.distanceFromUser != null && b.distanceFromUser != null) {
          return a.distanceFromUser - b.distanceFromUser;
        }
        return a.distanceMeters - b.distanceMeters;
      });
      cache.facilities.set(cacheKey, fallbackResults);
      return fallbackResults;
    }
  } catch (pErr) {
    console.warn('[Photon Fallback] error:', pErr.message);
  }

    return [];
}

module.exports = {
  getRoutes,
  getWaypointRoute,
  findAlternateSafetyRoute,
  formatDuration,
  getFacilitiesAlongRoute,
  geocode,
  suggest,
  reverseGeocode
};

