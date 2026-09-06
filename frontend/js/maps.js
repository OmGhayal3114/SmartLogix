// Leaflet + OpenStreetMap map integration.
import { state } from './state.js';

let map = null;
let routeLayer = null;
let facilityRouteLayer = null;
let userMarker = null;
let destinationPoint = null;
let locationWatchId = null;
let lastRemainingRequest = 0;
let markers = [];
let pendingFacilities = [];
let pendingAlerts = [];

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function ensureLeafletLoaded() {
  if (window.L) return Promise.resolve();
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Leaflet could not be loaded. Check your internet connection.'));
    document.head.appendChild(script);
  });
}

export async function initMap(containerId) {
  const element = document.getElementById(containerId);
  if (!element) return null;
  await ensureLeafletLoaded();
  if (map) map.remove();
  markers = [];
  userMarker = null;
  element.innerHTML = '';
  map = L.map(element, { center: [25.5, 92.5], zoom: 7, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
  }).addTo(map);
  if (pendingFacilities.length) addFacilityMarkers(pendingFacilities);
  if (pendingAlerts.length) addAlertMarkers(pendingAlerts);
  return map;
}

export function displayRoute(route) {
  if (!map || !route?.geometry) return;
  if (routeLayer) map.removeLayer(routeLayer);
  routeLayer = L.geoJSON(route.geometry, { style: { color: '#14b8a6', weight: 5, opacity: 0.9 } }).addTo(map);
  destinationPoint = route.destination;
  map.fitBounds(routeLayer.getBounds().pad(0.18));
  const coordinates = route.geometry.coordinates;
  const start = coordinates[0].slice().reverse();
  const end = coordinates[coordinates.length - 1].slice().reverse();
  L.marker(start, { icon: pointIcon('#5eead4', 'A') }).addTo(map).bindPopup(`<b>Origin</b><br>${escapeHtml(route.startAddress)}`);
  L.marker(end, { icon: pointIcon('#34d399', 'B') }).addTo(map).bindPopup(`<b>Destination</b><br>${escapeHtml(route.endAddress)}`);
}

export async function displayFacilityRoute(facility) {
  if (!map || !facility?.coordinates) return;
  const route = state.selectedRoute;
  const start = state.userLocation || route?.origin;
  if (!start) return;
  const destination = facility.coordinates;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const data = await response.json();
    const geometry = data.routes?.[0]?.geometry;
    const routeInfo = data.routes?.[0];
    if (!geometry || !routeInfo) throw new Error('No drivable route to this facility.');
    if (facilityRouteLayer) map.removeLayer(facilityRouteLayer);
    facilityRouteLayer = L.geoJSON(geometry, { style: { color: '#fb923c', weight: 5, opacity: 0.95, dashArray: '10 7' } }).addTo(map);
    const marker = L.marker([destination.lat, destination.lng], { icon: pointIcon('#fb923c', 'F') })
      .addTo(map)
      .bindPopup(`<b>${escapeHtml(facility.name)}</b><br>Directions destination`)
      .openPopup();
    markers.push(marker);
    map.fitBounds(facilityRouteLayer.getBounds().pad(0.2));
    const distance = `${(routeInfo.distance / 1000).toFixed(1)} km`;
    const duration = `${Math.max(1, Math.round(routeInfo.duration / 60))} min`;
    const info = document.getElementById('facility-direction-info');
    if (info) info.textContent = `Directions to ${facility.name}: ${distance} · ${duration}`;
    const directions = document.getElementById('facility-directions-list');
    if (directions) {
      const steps = routeInfo.legs?.[0]?.steps || [];
      directions.innerHTML = steps.map((step, index) => {
        const maneuver = step.maneuver || {};
        const modifier = maneuver.modifier ? maneuver.modifier.replace('-', ' ') : '';
        const action = maneuver.type === 'depart' ? 'Depart' : maneuver.type === 'arrive' ? 'Arrive at destination' : `${maneuver.type === 'continue' ? 'Continue' : maneuver.type.replace('-', ' ')}${modifier ? ` ${modifier}` : ''}`;
        const distanceText = step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance || 0)} m`;
        return `<div style="display:flex;gap:9px;padding:8px 0;border-bottom:1px solid #ffffff10"><b style="color:#fb923c;min-width:42px">${distanceText}</b><span>${index + 1}. ${escapeHtml(action)}${step.name ? ` <span style="color:#94a3b8">on ${escapeHtml(step.name)}</span>` : ''}</span></div>`;
      }).join('') || '<div style="color:#94a3b8">No turn-by-turn steps returned.</div>';
    }
  } catch (error) {
    const info = document.getElementById('facility-direction-info');
    if (info) info.textContent = `Could not calculate directions to ${facility.name}.`;
    console.warn('[Maps] Facility route failed:', error.message);
  }
}

function pointIcon(color, symbol) {
  return L.divIcon({ className: 'ner-map-marker', html: `<div style="background:${color};color:#07111f;width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px ${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">${symbol}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}

function setLocationStatus(text) {
  const element = document.getElementById('location-status');
  if (element) element.textContent = text;
}

async function updateRemainingDistance(position) {
  if (!destinationPoint || Date.now() - lastRemainingRequest < 10000) return;
  lastRemainingRequest = Date.now();
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${position.coords.longitude},${position.coords.latitude};${destinationPoint.lng},${destinationPoint.lat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();
    const distance = data.routes?.[0]?.distance;
    if (distance == null) return;
    state.remainingDistance = `${(distance / 1000).toFixed(1)} km`;
    const element = document.getElementById('remaining-distance');
    if (element) element.textContent = state.remainingDistance;
  } catch (error) {
    setLocationStatus('Live location available; remaining route distance is temporarily unavailable.');
  }
}

export function startUserLocationTracking() {
  if (!map || !navigator.geolocation) {
    setLocationStatus('Geolocation is not supported by this browser.');
    return;
  }
  if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
  setLocationStatus('Requesting your current location…');
  locationWatchId = navigator.geolocation.watchPosition(position => {
    const point = [position.coords.latitude, position.coords.longitude];
    state.userLocation = { lat: point[0], lng: point[1] };
    if (!userMarker) userMarker = L.marker(point, { icon: pointIcon('#60a5fa', '●') }).addTo(map);
    else userMarker.setLatLng(point);
    userMarker.bindPopup('Your current location');
    setLocationStatus(`Live location active · accuracy ${Math.round(position.coords.accuracy)} m`);
    updateRemainingDistance(position);
  }, error => {
    const messages = { 1: 'Location permission was denied.', 2: 'Your location could not be determined.', 3: 'Location request timed out.' };
    state.locationError = messages[error.code] || 'Unable to read your location.';
    setLocationStatus(state.locationError);
  }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
}

export function stopUserLocationTracking() {
  if (locationWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchId);
  locationWatchId = null;
}

export function clearMarkers() {
  markers.forEach(marker => map && map.removeLayer(marker));
  markers = [];
  pendingFacilities = [];
  pendingAlerts = [];
}

export function addFacilityMarkers(facilities) {
  pendingFacilities = facilities || [];
  if (!map) return;
  const colors = { hospital: '#ef4444', lodging: '#fb923c', gas_station: '#5eead4' };
  const labels = { hospital: 'Hospital', lodging: 'Hotel', gas_station: 'Petrol pump' };
  facilities.forEach(facility => {
    if (!facility.coordinates) return;
    const color = colors[facility.facilityType] || '#94a3b8';
    const marker = L.circleMarker([facility.coordinates.lat, facility.coordinates.lng], { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 })
      .addTo(map)
      .bindPopup(`<b>${escapeHtml(facility.name)}</b><br><span style="color:${color}">${labels[facility.facilityType] || escapeHtml(facility.facilityType)}</span><br><small>${escapeHtml(facility.address)}</small>`);
    markers.push(marker);
  });
}

export function addAlertMarkers(alerts) {
  pendingAlerts = alerts || [];
  if (!map) return;
  const stateCoordinates = {
    Assam: [26.14, 91.74], 'Arunachal Pradesh': [27.08, 93.61], Manipur: [24.66, 93.91],
    Meghalaya: [25.47, 91.37], Mizoram: [23.73, 92.72], Nagaland: [25.67, 94.11],
    Sikkim: [27.53, 88.51], Tripura: [23.75, 91.75]
  };
  alerts.forEach(alert => {
    const coordinates = alert.coordinates
      ? [alert.coordinates.lat, alert.coordinates.lng]
      : stateCoordinates[alert.state];
    if (!coordinates) return;
    const color = { CRITICAL: '#ef4444', HIGH: '#fb923c', MEDIUM: '#fbbf24', LOW: '#94a3b8' }[alert.severity] || '#fb923c';
    const marker = L.circleMarker(coordinates, { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(map)
      .bindPopup(`<b style="color:${color}">${escapeHtml(alert.severity)}: ${escapeHtml(alert.title)}</b><br>${escapeHtml(alert.location)}`);
    markers.push(marker);
  });
}
