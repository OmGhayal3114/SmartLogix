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
    summary: index === 0 ? 'OSRM Recommended Road Route' : `OSRM Alternative Route ${index + 1}`,
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
 */
async function getFacilitiesAlongRoute(origin, destination, types = ['hospital', 'lodging', 'gas_station', 'car_repair', 'parking', 'restaurant']) {
  const cacheKey = `${origin}->${destination}->${types.sort().join(',')}`;
  if (cache.facilities.has(cacheKey)) {
    return cache.facilities.get(cacheKey);
  }

  const [originPoint, destinationPoint] = await Promise.all([geocode(origin), geocode(destination)]);

  // Sample corridor centers: origin, midpoint, destination
  const centers = [
    [originPoint.lat, originPoint.lng],
    [(originPoint.lat + destinationPoint.lat) / 2, (originPoint.lng + destinationPoint.lng) / 2],
    [destinationPoint.lat, destinationPoint.lng]
  ];

  const wanted = new Set(types);
  const clauses = [];
  if (wanted.has('hospital')) clauses.push('nwr["amenity"="hospital"]');
  if (wanted.has('lodging')) clauses.push('nwr["tourism"~"hotel|motel|guest_house"]');
  if (wanted.has('gas_station')) clauses.push('nwr["amenity"="fuel"]');
  if (wanted.has('car_repair')) clauses.push('nwr["shop"="car_repair"]', 'nwr["craft"="car_repair"]');
  if (wanted.has('parking')) clauses.push('nwr["amenity"="parking"]');
  if (wanted.has('restaurant')) clauses.push('nwr["amenity"~"restaurant|fast_food|cafe"]');
  if (wanted.has('restroom')) clauses.push('nwr["amenity"="toilets"]');

  if (!clauses.length) return [];

  const query = `[out:json][timeout:20];(${centers.flatMap(([lat, lng]) => clauses.map(clause => `${clause}(around:20000,${lat},${lng});`)).join('')});out center tags;`;

  try {
    const response = await http.post(OVERPASS_URL, query, { headers: { 'Content-Type': 'text/plain' } });
    const seen = new Set();
    const facilities = (response.data?.elements || []).map(element => {
      const point = elementPoint(element);
      const tags = element.tags || {};
      if (!point[0] || !point[1]) return null;

      let facilityType = 'lodging';
      if (tags.amenity === 'hospital') facilityType = 'hospital';
      else if (tags.amenity === 'fuel') facilityType = 'gas_station';
      else if (tags.shop === 'car_repair' || tags.craft === 'car_repair' || tags.amenity === 'vehicle_inspection') facilityType = 'car_repair';
      else if (tags.amenity === 'parking') facilityType = 'parking';
      else if (['restaurant', 'fast_food', 'cafe'].includes(tags.amenity)) facilityType = 'restaurant';
      else if (tags.amenity === 'toilets') facilityType = 'restroom';

      const defaultNames = {
        hospital: 'Hospital / Health Center',
        gas_station: 'Petrol Pump',
        lodging: 'Hotel / Lodge',
        car_repair: 'Auto Repair / Garage',
        parking: 'Parking Facility',
        restaurant: 'Restaurant / Dhaba',
        restroom: 'Public Restroom'
      };

      // Compute minimum distance to corridor points
      let minDistance = Infinity;
      for (const [cLat, cLng] of centers) {
        const d = distanceMeters(point[0], point[1], cLat, cLng);
        if (d < minDistance) minDistance = d;
      }

      const address = [tags['addr:street'], tags['addr:city'] || tags['addr:district'], tags['addr:postcode']]
        .filter(Boolean).join(', ');

      return {
        id: `${element.type}/${element.id}`,
        placeId: `${element.type}/${element.id}`,
        name: tags.name || tags.brand || tags.operator || defaultNames[facilityType],
        brand: tags.brand || tags.operator || null,
        facilityType,
        address: address || 'Along Logistics Highway',
        coordinates: { lat: point[0], lng: point[1] },
        distanceMeters: minDistance,
        openingHours: tags.opening_hours || null,
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        source: 'OpenStreetMap'
      };
    }).filter(item => item && !seen.has(item.placeId) && seen.add(item.placeId));

    if (facilities.length > 0) {
      facilities.sort((a, b) => a.distanceMeters - b.distanceMeters);
      const result = facilities.slice(0, 40);
      cache.facilities.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[Overpass] POI notice:', err.message);
  }

  // Fast OSM Photon fallback along corridor
  try {
    const midLat = (originPoint.lat + destinationPoint.lat) / 2;
    const midLng = (originPoint.lng + destinationPoint.lng) / 2;
    const searchQueries = [
      { q: 'fuel', type: 'gas_station', name: 'Petrol Pump' },
      { q: 'hospital', type: 'hospital', name: 'Hospital' },
      { q: 'hotel', type: 'lodging', name: 'Hotel / Lodge' },
      { q: 'car repair', type: 'car_repair', name: 'Garage / Repair' }
    ];

    const fallbackResults = [];
    const seenFallback = new Set();

    for (const sq of searchQueries) {
      if (!wanted.has(sq.type)) continue;
      const resp = await http.get(PHOTON_URL, {
        params: { q: sq.q, lat: midLat, lon: midLng, limit: 10, lang: 'en' }
      });
      (resp.data?.features || []).forEach(f => {
        const coords = f.geometry?.coordinates || [];
        const p = f.properties || {};
        if (coords.length >= 2 && p.name) {
          const lat = coords[1];
          const lng = coords[0];
          const id = `photon/${p.osm_id || Math.random().toString(36).slice(2)}`;
          if (!seenFallback.has(id)) {
            seenFallback.add(id);
            const dist = distanceMeters(lat, lng, midLat, midLng);
            // Only keep if within 40km of corridor
            if (dist <= 40000) {
              const address = [p.street, p.city || p.district, p.state].filter(Boolean).join(', ');
              fallbackResults.push({
                id,
                placeId: id,
                name: p.name || sq.name,
                brand: null,
                facilityType: sq.type,
                address: address || 'Along Highway Corridor',
                coordinates: { lat, lng },
                distanceMeters: dist,
                openingHours: null,
                phone: null,
                website: null,
                source: 'OpenStreetMap'
              });
            }
          }
        }
      });
    }

    if (fallbackResults.length > 0) {
      fallbackResults.sort((a, b) => a.distanceMeters - b.distanceMeters);
      const result = fallbackResults.slice(0, 30);
      cache.facilities.set(cacheKey, result);
      return result;
    }
  } catch (pErr) {
    console.warn('[Photon Fallback] POI error:', pErr.message);
  }

  return [];
}

module.exports = {
  getRoutes,
  getWaypointRoute,
  getFacilitiesAlongRoute,
  geocode,
  suggest,
  reverseGeocode
};
