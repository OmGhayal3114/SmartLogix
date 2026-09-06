const axios = require('axios');

const GEOCODER_URL = 'https://photon.komoot.io/api/';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'NER-SmartLogix/1.0 (logistics accessibility prototype)';

const http = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
});

async function geocode(place) {
  const response = await http.get(GEOCODER_URL, {
    params: { q: `${place}, India`, limit: 1, lang: 'en' }
  });
  const feature = response.data?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    throw new Error(`Could not find a location for "${place}".`);
  }
  return {
    lat: coordinates[1],
    lng: coordinates[0],
    name: feature.properties?.name || place,
    label: [feature.properties?.name, feature.properties?.city, feature.properties?.state]
      .filter(Boolean).join(', ')
  };
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
  const action = maneuver.type === 'depart' ? 'Depart' : maneuver.type === 'arrive' ? 'Arrive at your destination' : `${maneuver.type === 'continue' ? 'Continue' : maneuver.type.replace('-', ' ')}${modifier ? ` ${modifier}` : ''}`;
  const road = step.name ? ` onto ${step.name}` : '';
  const distance = step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance || 0)} m`;
  return `${distance} — ${action}${road}`;
}

function routeToResult(route, index, origin, destination, originPoint, destinationPoint, vehicleType) {
  return {
    index,
    summary: index === 0 ? 'OSRM recommended road route' : `OSRM alternative route ${index + 1}`,
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
    warnings: ['Traffic conditions are not included by the public OSRM service.']
  };
}

async function getRoutes(origin, destination, vehicleType = 'Truck') {
  const [originPoint, destinationPoint] = await Promise.all([geocode(origin), geocode(destination)]);
  const response = await http.get(`${OSRM_URL}/${originPoint.lng},${originPoint.lat};${destinationPoint.lng},${destinationPoint.lat}`, {
    params: { overview: 'full', geometries: 'geojson', alternatives: 'true', steps: 'true' }
  });
  if (response.data?.code !== 'Ok' || !response.data.routes?.length) {
    throw new Error('No drivable route was found between those locations.');
  }
  return response.data.routes.slice(0, 2).map((route, index) =>
    routeToResult(route, index, origin, destination, originPoint, destinationPoint, vehicleType)
  );
}

function elementPoint(element) {
  return element.type === 'node'
    ? [element.lat, element.lon]
    : [element.center?.lat, element.center?.lon];
}

async function getFacilitiesAlongRoute(origin, destination, types = ['hospital', 'lodging', 'gas_station']) {
  const [originPoint, destinationPoint] = await Promise.all([geocode(origin), geocode(destination)]);
  const midLat = (originPoint.lat + destinationPoint.lat) / 2;
  const midLng = (originPoint.lng + destinationPoint.lng) / 2;
  const wanted = new Set(types);
  const clauses = [];
  if (wanted.has('hospital')) clauses.push('nwr["amenity"="hospital"]');
  if (wanted.has('lodging')) clauses.push('nwr["tourism"="hotel"]');
  if (wanted.has('gas_station')) clauses.push('nwr["amenity"="fuel"]');
  if (!clauses.length) return [];

  // Search along the corridor instead of only at its midpoint so facilities
  // near either endpoint are included on long routes.
  const centers = [[originPoint.lat, originPoint.lng], [midLat, midLng], [destinationPoint.lat, destinationPoint.lng]];
  const query = `[out:json][timeout:25];(${centers.flatMap(([lat, lng]) => clauses.map(clause => `${clause}(around:25000,${lat},${lng});`)).join('')});out center tags;`;
  const response = await http.post(OVERPASS_URL, query, { headers: { 'Content-Type': 'text/plain' } });
  const seen = new Set();
  return (response.data?.elements || []).map(element => {
    const point = elementPoint(element);
    const tags = element.tags || {};
    if (!point[0] || !point[1]) return null;
    let facilityType = tags.amenity === 'hospital' ? 'hospital' : tags.amenity === 'fuel' ? 'gas_station' : 'lodging';
    return {
      placeId: `${element.type}/${element.id}`,
      name: tags.name || (facilityType === 'hospital' ? 'Hospital' : facilityType === 'gas_station' ? 'Petrol pump' : 'Hotel'),
      address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
      rating: null,
      openNow: null,
      coordinates: { lat: point[0], lng: point[1] },
      facilityType,
      source: 'OpenStreetMap'
    };
  }).filter(item => item && !seen.has(item.placeId) && seen.add(item.placeId)).slice(0, 30);
}

module.exports = { getRoutes, getFacilitiesAlongRoute, geocode };
