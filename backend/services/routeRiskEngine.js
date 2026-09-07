const Alert = require('../models/Alert');

const NER_CITY_COORDS = {
  guwahati: [26.1445, 91.7362], shillong: [25.5788, 91.8933], kohima: [25.6751, 94.1086],
  dimapur: [25.9063, 93.7263], imphal: [24.8170, 93.9368], aizawl: [23.7307, 92.7173],
  agartala: [23.8315, 91.2868], itanagar: [27.0844, 93.6053], gangtok: [27.3389, 88.6065],
  silchar: [24.8333, 92.7789], jorhat: [26.7465, 94.2026], dibrugarh: [27.4728, 94.9120],
  tezpur: [26.6338, 92.7931], tura: [25.5164, 90.2219], churachandpur: [24.3333, 93.6833],
  pasighat: [28.0667, 95.3333], tawang: [27.5859, 91.8669], nagaon: [26.3481, 92.6841],
  mokokchung: [26.3243, 94.5126], lunglei: [22.8854, 92.7315], nongpoh: [25.9010, 91.8760],
  jowai: [25.4500, 92.2000], rangpo: [27.1770, 88.5330], singtam: [27.2340, 88.5000],
  jiribam: [24.7990, 93.1160], senapati: [24.6000, 94.0500], chomukedima: [25.6200, 93.7300]
};

const SEVERITY_WEIGHT = { LOW: 8, MEDIUM: 18, HIGH: 30, CRITICAL: 42 };
const TYPE_WEIGHT = {
  'Road Closure': 1.35,
  'Bridge Damage': 1.30,
  'Landslide': 1.25,
  'Flood': 1.20,
  'Road Blockage': 1.10,
  'Heavy Rainfall': 1.00,
  'Infrastructure Damage': 0.95,
  'Traffic Disruption': 0.75,
  Weather: 0.70,
  Other: 0.50
};

const VEHICLE_FACTOR = {
  'Truck': 1.00,
  'Heavy Truck': 1.18,
  'Mini Truck': 0.92,
  'Cargo Van': 0.84,
  'Pickup': 0.78,
  'Refrigerated Truck': 1.08,
  'Tanker': 1.20
};

const degToRad = d => (d * Math.PI) / 180;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(a.lat)) * Math.cos(degToRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function samplePolyline(points, maxSamples = 18) {
  if (points.length <= maxSamples) return points;
  const samples = [];
  for (let i = 0; i < maxSamples; i++) {
    const idx = Math.round(i * (points.length - 1) / (maxSamples - 1));
    samples.push(points[idx]);
  }
  return samples;
}

function geometryPoints(route) {
  const coords = route?.geometry?.coordinates;
  if (!Array.isArray(coords)) return [];

  // OSM/GeoJSON route geometry is [lng, lat].
  return coords
    .filter(point => Array.isArray(point) && point.length >= 2)
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function inferCoordinates(alert) {
  if (alert.coordinates && Number.isFinite(alert.coordinates.lat) && Number.isFinite(alert.coordinates.lng)) {
    return { lat: alert.coordinates.lat, lng: alert.coordinates.lng, source: 'alert' };
  }

  const text = [alert.location, alert.district, alert.description, alert.title]
    .filter(Boolean).join(' ').toLowerCase();
  for (const [city, [lat, lng]] of Object.entries(NER_CITY_COORDS)) {
    if (text.includes(city)) return { lat, lng, source: 'inferred-location' };
  }
  return null;
}


function inferPlaceCoordinates(text) {
  const lower = String(text || '').toLowerCase();
  for (const [city, [lat, lng]] of Object.entries(NER_CITY_COORDS)) {
    if (lower.includes(city)) return { lat, lng };
  }
  return null;
}

function nearestDistanceKm(point, routePoints) {
  let best = Infinity;
  for (const routePoint of routePoints) {
    best = Math.min(best, haversineKm(point, routePoint));
  }
  return best;
}

function labelForScore(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 38) return 'MEDIUM';
  return 'LOW';
}

function getRecommendation(risk, vehicleType, closures) {
  if (closures > 0) return 'Avoid this route: an active closure is affecting the corridor.';
  if (risk === 'HIGH') {
    return vehicleType === 'Tanker' || vehicleType === 'Heavy Truck'
      ? 'Use an alternate route or delay departure; heavy vehicles face elevated hazard exposure.'
      : 'Consider the alternate route and review active hazard locations before departure.';
  }
  if (risk === 'MEDIUM') return 'Route is usable with caution. Monitor alerts before and during the trip.';
  return 'No major route-specific hazards detected. Continue normal monitoring.';
}

async function loadActiveAlerts() {
  return Alert.find({ status: 'active' })
    .sort({ priorityScore: -1, createdAt: -1 })
    .limit(100)
    .lean();
}


exports.scoreRoute = async (route, vehicleType = 'Truck', alerts = null) => {
  // Prefer real OSM/GeoJSON road geometry. Keep encoded-polyline support for
  // any future Google Maps routes without changing the public API.
  const geometry = geometryPoints(route);
  const decoded = geometry.length >= 2 ? geometry : decodePolyline(route.polyline || '');
  let routePoints = samplePolyline(decoded);


  if (routePoints.length < 2) {
    const start = inferPlaceCoordinates(route.startAddress || '');
    const end = inferPlaceCoordinates(route.endAddress || '');
    if (start && end) {
      const points = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        points.push({
          lat: start.lat + (end.lat - start.lat) * t,
          lng: start.lng + (end.lng - start.lng) * t
        });
      }
      routePoints = points;
    }
  }

  if (!alerts) {
    alerts = await loadActiveAlerts();
  }

  const nearbyHazards = [];
  let hazardScore = 0;
  let closureCount = 0;

  for (const alert of alerts) {
    const coords = inferCoordinates(alert);
    if (!coords || routePoints.length === 0) continue;

    const distanceKm = nearestDistanceKm(coords, routePoints);
    if (distanceKm > 30) continue;

    const proximityFactor = distanceKm <= 5 ? 1.0 : distanceKm <= 15 ? 0.65 : 0.30;
    const severityBase = SEVERITY_WEIGHT[alert.severity] || 10;
    const typeFactor = TYPE_WEIGHT[alert.alertType] || 0.5;
    const contribution = severityBase * typeFactor * proximityFactor;

    if (['Road Closure', 'Road Blockage'].includes(alert.alertType)) {
      closureCount += 1;
    }
    hazardScore += contribution;

    nearbyHazards.push({
      id: String(alert._id),
      title: alert.title,
      alertType: alert.alertType,
      severity: alert.severity,
      distanceKm: Number(distanceKm.toFixed(1)),
      contribution: Number(contribution.toFixed(1)),
      source: alert.source,
      sourceUrl: alert.sourceUrl || ''
    });
  }

  nearbyHazards.sort((a, b) => b.contribution - a.contribution);
  const topHazards = nearbyHazards.slice(0, 6);

  const vehicleFactor = VEHICLE_FACTOR[vehicleType] || 1;
  const distancePenalty = Math.min(
    ((Number(route.distanceValue) || 0) / 1000 / 500) * 6,
    6
  );
  const delayPenalty = route.durationInTraffic && route.durationValue
    ? Math.min(Math.max((parseTrafficDuration(route.durationInTraffic) - route.durationValue) / route.durationValue, 0) * 20, 10)
    : 0;

  // Keep the score interpretable: hazards dominate, route length/traffic only
  // provide small tie-break penalties, and vehicle type adjusts exposure.
  const rawScore = Math.min(100, (hazardScore * vehicleFactor) + distancePenalty + delayPenalty);
  const score = Number(rawScore.toFixed(1));
  const risk = labelForScore(score);

  const reasons = [];
  if (topHazards.length) {
    const high = topHazards.filter(h => ['HIGH', 'CRITICAL'].includes(h.severity)).length;
    if (high) reasons.push(`${high} high-severity hazard(s) within 30 km of the route.`);
    reasons.push(...topHazards.slice(0, 2).map(h => `${h.alertType} (${h.distanceKm} km away).`));
  } else {
    reasons.push('No geolocated active hazards matched this route.');
  }
  if (vehicleFactor > 1) reasons.push(`${vehicleType} exposure factor applied.`);
  if (delayPenalty > 0) reasons.push('Current traffic time increases the route penalty.');

  return {
    risk,
    score,
    confidence: topHazards.length ? Number(Math.min(0.98, 0.58 + topHazards.length * 0.06).toFixed(2)) : 0.55,
    recommendation: getRecommendation(risk, vehicleType, closureCount),
    reasons,
    hazards: topHazards,
    metrics: {
      matchedHazards: nearbyHazards.length,
      closureCount,
      routePoints: routePoints.length,
      vehicleFactor,
      hazardScore: Number(hazardScore.toFixed(1))
    },
    scoringVersion: 'geo-risk-v1'
  };
};

exports.scoreRoutes = async (routes, vehicleType = 'Truck') => {
  const alerts = await loadActiveAlerts();
  return Promise.all(routes.map(route => exports.scoreRoute(route, vehicleType, alerts)));
};

function parseTrafficDuration(value) {
  if (typeof value === 'number') return value;
  const match = String(value || '').match(/(?:(\d+)\s*hr)?\s*(?:(\d+)\s*min)?/i);
  if (!match) return 0;
  return ((Number(match[1]) || 0) * 60 + (Number(match[2]) || 0)) * 60;
}

exports.decodePolyline = decodePolyline;
exports.geometryPoints = geometryPoints;
exports.labelForScore = labelForScore;
