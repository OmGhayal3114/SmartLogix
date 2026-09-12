// NER SmartLogix — OpenStreetMap & Leaflet Navigation Platform
import { state } from './state.js';
import { api } from './api.js';

let map = null;
let mainRouteLayer = null;
let detourRouteLayer = null;
let originMarker = null;
let destinationMarker = null;
let userMarker = null;
let userAccuracyCircle = null;
let facilityMarkersGroup = null;
let alertMarkersGroup = null;
let riskZonesLayerGroup = null;
let facilityTargetMarker = null;
let facilityStartMarker = null;
let locationWatchId = null;
let mapResizeObserver = null;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

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

const TYPE_COLOR = {
  hospital: '#ef4444',
  pharmacy: '#38bdf8',
  police: '#60a5fa',
  gas_station: 'var(--teal)',
  lodging: 'var(--orange)',
  car_repair: '#fbbf24',
  parking: 'var(--muted)',
  restaurant: '#a78bfa',
  restroom: '#2dd4bf'
};

const TYPE_SYMBOL = {
  hospital: '🏥',
  pharmacy: '💊',
  police: '🚓',
  gas_station: '⛽',
  lodging: '🏨',
  car_repair: '🔧',
  parking: '🅿️',
  restaurant: '🍽️',
  restroom: '🚻'
};

const TYPE_LABEL = {
  hospital: 'Hospital / Clinic',
  pharmacy: 'Pharmacy / Medical',
  police: 'Police Station',
  gas_station: 'Petrol Pump',
  lodging: 'Hotel / Lodge',
  car_repair: 'Vehicle Repair / Garage',
  parking: 'Parking & Rest Area',
  restaurant: 'Restaurant / Dhaba',
  restroom: 'Public Restroom'
};

/**
 * Creates custom target pin SVG for selected facility.
 */
function createFacilityPinIcon(color, symbol) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
    <defs>
      <filter id="p-fac-sh" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.75"/>
      </filter>
    </defs>
    <path d="M19 0C8.5 0 0 8.5 0 19c0 13.8 17 29.5 18.2 30.6.4.4 1.2.4 1.6 0C21 48.5 38 32.8 38 19 38 8.5 29.5 0 19 0z" fill="${color}" filter="url(#p-fac-sh)"/>
    <circle cx="19" cy="19" r="13" fill="#07111f" stroke="#ffffff" stroke-width="2"/>
    <text x="19" y="24" fill="#ffffff" font-size="14" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif" text-anchor="middle">${symbol}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-osm-target-pin',
    iconSize: [38, 50],
    iconAnchor: [19, 50],
    popupAnchor: [0, -50]
  });
}

/**
 * Ensures Leaflet library is loaded from CDN or local cache.
 */
function ensureLeafletLoaded() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    let script = document.getElementById('leaflet-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'leaflet-script';
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
    }
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet library.'));
  });
}

/**
 * Creates custom pin SVG icons for Origin ('A') and Destination ('B').
 */
function createPinIcon(color, text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <defs>
      <filter id="p-sh" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11.5 14 24.5 15.3 25.6.4.3 1 .3 1.4 0C18 40.5 32 27.5 32 16 32 7.163 24.837 0 16 0z" fill="${color}" filter="url(#p-sh)"/>
    <circle cx="16" cy="16" r="10.5" fill="#07111f" stroke="#ffffff" stroke-width="1.5"/>
    <text x="16" y="20.5" fill="#ffffff" font-size="12" font-family="Inter, system-ui, sans-serif" font-weight="700" text-anchor="middle">${text}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-osm-pin',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
}

/**
 * Creates facility emoji badge icons for Leaflet.
 */
function createFacilityIcon(color, symbol) {
  const html = `<div style="
    background:${color};
    color:var(--bg);
    width:28px;
    height:28px;
    border-radius:50%;
    border:2px solid #ffffff;
    box-shadow:0 3px 10px rgba(0,0,0,0.6);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:14px;
    cursor:pointer;
    transform:translate(-14px, -14px);
  ">${symbol}</div>`;

  return L.divIcon({
    html,
    className: 'custom-facility-icon',
    iconSize: [28, 28]
  });
}

/**
 * Completely tears down the Leaflet map instance, layers, and observers.
 */
export function destroyMap() {
  stopUserLocationTracking();
  if (mapResizeObserver) {
    mapResizeObserver.disconnect();
    mapResizeObserver = null;
  }
  if (map) {
    try {
      map.remove();
    } catch (_) {}
    map = null;
  }
  mainRouteLayer = null;
  detourRouteLayer = null;
  originMarker = null;
  destinationMarker = null;
  userMarker = null;
  userAccuracyCircle = null;
  facilityMarkersGroup = null;
  alertMarkersGroup = null;
  riskZonesLayerGroup = null;
  facilityTargetMarker = null;
  facilityStartMarker = null;
}
window.destroyMap = destroyMap;

/**
 * Initializes interactive OpenStreetMap inside container using Leaflet.
 * Validates container visibility, handles mounting lifecycle, reuses or
 * recreates instances cleanly, and observes container size changes.
 */
export async function initMap(containerId = 'osm-map') {
  let element = document.getElementById(containerId);
  if (!element) {
    element = document.getElementById('google-map') || document.getElementById('map');
  }
  if (!element || !document.body.contains(element)) return null;

  await ensureLeafletLoaded();

  // Re-check container in case DOM changed during async Leaflet loading
  element = document.getElementById(containerId) || document.getElementById('google-map') || document.getElementById('map');
  if (!element || !document.body.contains(element)) return null;

  // If Leaflet is already mounted on this exact DOM element, reuse it
  if (map && element._leaflet_id && map.getContainer() === element) {
    try {
      map.invalidateSize(true);
      if (mainRouteLayer && !map.hasLayer(mainRouteLayer)) mainRouteLayer.addTo(map);
      if (facilityMarkersGroup && !map.hasLayer(facilityMarkersGroup)) facilityMarkersGroup.addTo(map);
      if (alertMarkersGroup && !map.hasLayer(alertMarkersGroup)) alertMarkersGroup.addTo(map);
      if (riskZonesLayerGroup && !map.hasLayer(riskZonesLayerGroup)) riskZonesLayerGroup.addTo(map);
    } catch (_) {}
    return map;
  }

  // Clean up any previous stale map instance
  destroyMap();

  // Clear any leftover DOM and Leaflet state
  element.innerHTML = '';
  delete element._leaflet_id;

  // Default center: Guwahati, Assam (Logistics gateway of North Eastern Region)
  const defaultCenter = [26.14, 91.74];

  map = L.map(element, {
    center: defaultCenter,
    zoom: 7,
    zoomControl: false // custom position
  });

  // Official OpenStreetMap tiles
  const osmTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Fallback to OSM Humanitarian tiles if needed
  osmTiles.on('tileerror', () => {
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(map);
  });

  // Add zoom control at bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Initialize marker groups
  facilityMarkersGroup = L.layerGroup().addTo(map);
  alertMarkersGroup = L.layerGroup().addTo(map);
  riskZonesLayerGroup = L.layerGroup().addTo(map);

  // ResizeObserver ensures Leaflet updates whenever container layout or transition completes
  if (window.ResizeObserver) {
    if (mapResizeObserver) {
      mapResizeObserver.disconnect();
    }
    mapResizeObserver = new ResizeObserver(() => {
      if (map) {
        try { map.invalidateSize(false); } catch (_) {}
      }
    });
    mapResizeObserver.observe(element);
  }

  // Staggered size recalculations to handle post-navigation layout settlements
  requestAnimationFrame(() => {
    try { if (map) map.invalidateSize(true); } catch (_) {}
  });
  setTimeout(() => { try { if (map) map.invalidateSize(true); } catch(_) {} }, 100);
  setTimeout(() => { try { if (map) map.invalidateSize(true); } catch(_) {} }, 300);
  setTimeout(() => { try { if (map) map.invalidateSize(true); } catch(_) {} }, 600);

  // Floating "Center on My Location" control button
  const floatingCtrl = document.createElement('div');
  floatingCtrl.className = 'map-floating-ctrl';
  floatingCtrl.innerHTML = `
    <button class="map-icon-btn" onclick="window.centerOnUserLocation()" title="Center on My GPS Location">
      📍
    </button>
  `;
  element.appendChild(floatingCtrl);

  // Map click handler to pick a location
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    try {
      const geo = await api.reverseGeocode(lat, lng);
      const addr = geo.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family:Inter,sans-serif;padding:6px;max-width:220px">
            <b style="color:var(--teal);font-size:12px">Selected Point</b>
            <div style="color:var(--muted);font-size:11px;margin:4px 0">${escapeHtml(addr)}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="window.setMapLocationAs('origin', '${escapeHtml(addr)}', ${lat}, ${lng})" style="background:#14b8a6;color:var(--bg);border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">Set as Origin</button>
              <button onclick="window.setMapLocationAs('dest', '${escapeHtml(addr)}', ${lat}, ${lng})" style="background:var(--card);color:var(--teal);border:1px solid #14b8a6;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">Set as Dest</button>
            </div>
          </div>
        `)
        .openOn(map);
    } catch (_) {}
  });

  // Re-display active route if already in state
  if (state.selectedRoute) {
    displayRoute(state.selectedRoute);
  }

  // Add facility markers if in state
  if (state.facilities && state.facilities.length > 0) {
    addFacilityMarkers(state.facilities);
  }

  // Add alert markers if in state
  if (state.top10Alerts && state.top10Alerts.length > 0) {
    addAlertMarkers(state.top10Alerts);
  }

  return map;
}

/**
 * Centers the map on the user's current GPS location.
 */
export function centerOnUserLocation() {
  if (state.userLocation && map) {
    map.flyTo([state.userLocation.lat, state.userLocation.lng], 13, { duration: 1 });
  } else {
    startUserLocationTracking();
  }
}
window.centerOnUserLocation = centerOnUserLocation;

/**
 * Handles map click to set Origin or Destination directly.
 */
window.setMapLocationAs = async (type, addr, lat, lng) => {
  const { notify } = await import('./render.js');
  if (type === 'origin') {
    state.origin = addr;
    state.userLocation = { lat, lng };
    notify(`Origin set: ${addr}`, 'success');
  } else {
    state.destination = addr;
    notify(`Destination set: ${addr}`, 'success');
  }
  if (map) map.closePopup();
  if (window.render) window.render();
};

/**
 * Displays the primary driving route on OpenStreetMap with Leaflet.
 */
export function displayRoute(route) {
  if (!map || !route) return;

  // Clear previous main route layer & markers
  if (mainRouteLayer) {
    map.removeLayer(mainRouteLayer);
    mainRouteLayer = null;
  }
  if (riskZonesLayerGroup) {
    riskZonesLayerGroup.clearLayers();
  }
  if (originMarker) {
    map.removeLayer(originMarker);
    originMarker = null;
  }
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }

  if (!route.geometry) return;

  // Draw road route line in vibrant navigation green
  mainRouteLayer = L.geoJSON(route.geometry, {
    style: {
      color: '#10b981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }
  }).addTo(map);

  // Fit camera bounds with padding
  try {
    map.invalidateSize(false);
    map.fitBounds(mainRouteLayer.getBounds(), { padding: [40, 40] });
  } catch (_) {}

  // Coordinates: GeoJSON format [lng, lat]
  const coords = route.geometry.coordinates || [];
  if (coords.length >= 2) {
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    originMarker = L.marker([startCoord[1], startCoord[0]], {
      icon: createPinIcon('var(--teal)', 'A')
    }).addTo(map).bindPopup(`
      <div style="font-family:Inter,sans-serif">
        <b style="color:var(--teal);font-size:12px">Origin:</b>
        <div style="color:var(--text);font-size:12px;margin-top:2px">${escapeHtml(route.startAddress || state.origin)}</div>
      </div>
    `);

    destinationMarker = L.marker([endCoord[1], endCoord[0]], {
      icon: createPinIcon('var(--green)', 'B')
    }).addTo(map).bindPopup(`
      <div style="font-family:Inter,sans-serif">
        <b style="color:var(--green);font-size:12px">Destination:</b>
        <div style="color:var(--text);font-size:12px;margin-top:2px">${escapeHtml(route.endAddress || state.destination)}</div>
      </div>
    `);
  }

  // Immediately populate HUD with OSRM-provided distance & duration
  // These values come directly from the routing engine — never from fixed speed
  if (route.distance && route.duration) {
    state.remainingDistance = route.distance;
    state.remainingDuration = route.duration;
    const distEl = document.getElementById('remaining-distance');
    if (distEl) distEl.textContent = route.distance;
    const etaEl = document.getElementById('remaining-eta');
    if (etaEl) etaEl.textContent = route.duration;
  }

  // Automatically search and display accessibility facilities along this route
  searchFacilitiesAlongRoute(route);
}

/**
 * Searches accessibility facilities along the route corridor using Overpass / OSM.
 * Passes actual OSRM route geometry to backend for accurate road-based sampling.
 */
export async function searchFacilitiesAlongRoute(route) {
  if (!route) return;

  const originName = state.origin || route.startAddress || '';
  const destName = state.destination || route.endAddress || '';
  if (!originName || !destName) return;

  // If already loaded for this route, display markers directly
  if (state.facilities?.length > 0 && state._loadedRouteForFacilities === route) {
    addFacilityMarkers(state.facilities);
    return;
  }

  // Extract and thin real road geometry — max 20 sampled points keeps payload small
  // while giving the backend sufficient corridor coverage across the full route.
  const rawCoords = route?.geometry?.coordinates || [];
  const routeCoords = rawCoords.length <= 20
    ? rawCoords
    : Array.from({ length: 20 }, (_, i) => rawCoords[Math.round(i * (rawCoords.length - 1) / 19)]);

  try {
    const data = await api.getFacilitiesNearRoute(originName, destName, routeCoords);
    if (data && Array.isArray(data.facilities) && data.facilities.length > 0) {
      state.facilities = data.facilities;
      state._loadedRouteForFacilities = route;
      addFacilityMarkers(state.facilities);
      if (window.render && state.page === 'Facilities') {
        window.render();
      }
    }
  } catch (err) {
    console.warn('[Facilities] Error loading facilities along route:', err.message);
  }
}

/**
 * Adds accessibility markers along the route on the OpenStreetMap map.
 */
export function addFacilityMarkers(facilities) {
  if (!facilityMarkersGroup) return;
  facilityMarkersGroup.clearLayers();
  if (!facilities || facilities.length === 0) return;

  facilities.forEach(f => {
    if (!f.coordinates || !f.coordinates.lat || !f.coordinates.lng) return;
    if (f.facilityType === 'atm') return; // Exclude ATM

    const color = TYPE_COLOR[f.facilityType] || '#14b8a6';
    const symbol = TYPE_SYMBOL[f.facilityType] || '📍';
    const label = TYPE_LABEL[f.facilityType] || f.facilityType;

    const marker = L.marker([f.coordinates.lat, f.coordinates.lng], {
      icon: createFacilityIcon(color, symbol)
    });

    const distText = f.distanceMeters >= 1000
      ? `${(f.distanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(f.distanceMeters || 0)} m`;

    let userGpsBadge = '';
    if (state.userLocation && state.userLocation.lat) {
      const dMeters = f.distanceFromUser != null
        ? f.distanceFromUser
        : (typeof distanceMeters === 'function' ? distanceMeters(state.userLocation.lat, state.userLocation.lng, f.coordinates.lat, f.coordinates.lng) : null);
      if (dMeters != null) {
        const uText = dMeters >= 1000 ? `${(dMeters / 1000).toFixed(1)} km` : `${Math.round(dMeters)} m`;
        userGpsBadge = `<div style="color:#0284c7;font-size:11px;margin-top:4px;font-weight:600">📡 ${uText} from your GPS location</div>`;
      }
    }

    const details = [];
    if (f.brand) details.push(`<span style="color:var(--teal)">Brand: ${escapeHtml(f.brand)}</span>`);
    if (f.openingHours) details.push(`<span style="color:var(--muted)">Hours: ${escapeHtml(f.openingHours)}</span>`);
    if (f.phone) details.push(`<span style="color:var(--muted)">Phone: ${escapeHtml(f.phone)}</span>`);
    if (f.website) details.push(`<a href="${escapeHtml(f.website)}" target="_blank" style="color:var(--teal)">Website ↗</a>`);

    const popupContent = `
      <div style="font-family:Inter,sans-serif;min-width:220px;max-width:280px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <strong style="font-size:14px;color:var(--text);line-height:1.3">${escapeHtml(f.name)}</strong>
          <span style="font-size:10px;font-weight:bold;background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 6px;border-radius:4px;white-space:nowrap">${escapeHtml(label)}</span>
        </div>
        <div style="color:var(--muted);font-size:11px;margin-top:6px;line-height:1.4">${escapeHtml(f.address)}</div>
        <div style="color:var(--teal);font-size:11px;margin-top:4px">📍 ${distText} off route corridor</div>
        ${details.length > 0 ? `<div style="font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #ffffff15;display:flex;flex-direction:column;gap:3px">${details.join('')}</div>` : ''}
        <div style="margin-top:12px">
          <button onclick="window.getDirectionsToFacility('${f.placeId || f.id}')" style="background:#14b8a6;color:var(--bg);border:none;width:100%;padding:7px 12px;border-radius:6px;font-weight:bold;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
            <span>🧭</span> Get Directions
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    facilityMarkersGroup.addLayer(marker);
  });
}

/**
/**
 * Calculates road route to a selected facility.
 * Uses current user GPS position when available, falling back to trip corridor origin.
 * Prominently pins the facility destination and the start location on the map,
 * and fits the view to both points with turn-by-turn guidance.
 */
export async function displayFacilityRoute(facility, forceMode = null) {
  if (!facility?.coordinates?.lat || !facility?.coordinates?.lng) return;

  // If map is not yet created, initialize it
  if (!map) {
    const oMap = await initMap('osm-map');
    if (!oMap) return;
  }

  // Save original route if not already saved
  if (!state._originalMainRoute && state.selectedRoute) {
    state._originalMainRoute = state.selectedRoute;
  }
  state.selectedFacility = facility;

  const destLat = Number(facility.coordinates.lat);
  const destLng = Number(facility.coordinates.lng);

  // If GPS is currently connecting and not yet resolved, flag for reactive update
  const hasGps = Boolean(state.userLocation && state.userLocation.lat && state.userLocation.lng);
  if (!hasGps && forceMode !== 'origin' && navigator.geolocation) {
    state._facilityRoutePendingGps = true;
  }

  // Determine starting point: user GPS vs corridor origin
  let startLat = null;
  let startLng = null;
  let startLabel = 'Current Location';
  let isUserGps = false;

  if (forceMode === 'origin' && state.selectedRoute?.origin?.lat) {
    startLat = state.selectedRoute.origin.lat;
    startLng = state.selectedRoute.origin.lng;
    startLabel = state.selectedRoute.startAddress || state.origin || 'Trip Origin';
    isUserGps = false;
    state._facilityRoutePendingGps = false;
  } else if (forceMode === 'gps' && hasGps) {
    startLat = state.userLocation.lat;
    startLng = state.userLocation.lng;
    startLabel = 'Your Current GPS Location';
    isUserGps = true;
  } else if (hasGps) {
    startLat = state.userLocation.lat;
    startLng = state.userLocation.lng;
    startLabel = 'Your Current GPS Location';
    isUserGps = true;
  } else if (state.selectedRoute?.origin?.lat) {
    startLat = state.selectedRoute.origin.lat;
    startLng = state.selectedRoute.origin.lng;
    startLabel = state.selectedRoute.startAddress || state.origin || 'Trip Origin';
    isUserGps = false;
  } else if (state.selectedRoute?.geometry?.coordinates?.[0]) {
    startLat = state.selectedRoute.geometry.coordinates[0][1];
    startLng = state.selectedRoute.geometry.coordinates[0][0];
    startLabel = state.selectedRoute.startAddress || state.origin || 'Corridor Origin';
    isUserGps = false;
  }

  if (!startLat || !startLng) return;

  // Track mode in state
  state._facilityRouteMode = isUserGps ? 'gps' : 'origin';

  // 1. PROMINENTLY PLACE FACILITY TARGET MARKER ON MAP
  const color = TYPE_COLOR[facility.facilityType] || '#ef4444';
  const symbol = TYPE_SYMBOL[facility.facilityType] || '📍';
  const label = TYPE_LABEL[facility.facilityType] || facility.facilityType || 'Facility';

  if (facilityTargetMarker) {
    try { map.removeLayer(facilityTargetMarker); } catch (_) {}
    facilityTargetMarker = null;
  }

  facilityTargetMarker = L.marker([destLat, destLng], {
    icon: createFacilityPinIcon(color, symbol),
    zIndexOffset: 2500
  }).addTo(map);

  const directDistMeters = distanceMeters(startLat, startLng, destLat, destLng);
  const directDistText = directDistMeters >= 1000
    ? `${(directDistMeters / 1000).toFixed(1)} km`
    : `${Math.round(directDistMeters)} m`;

  const popupHtml = `
    <div style="font-family:Inter,sans-serif;min-width:240px;max-width:300px;padding:4px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <strong style="font-size:14px;color:var(--text);line-height:1.3">${escapeHtml(facility.name)}</strong>
        <span style="font-size:10px;font-weight:bold;background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 6px;border-radius:4px;white-space:nowrap">${escapeHtml(label)}</span>
      </div>
      <div style="color:var(--muted);font-size:11px;margin-top:6px;line-height:1.4">${escapeHtml(facility.address || 'Along route corridor')}</div>
      <div style="color:#0284c7;font-size:11px;margin-top:4px;font-weight:600">
        📍 ${directDistText} from ${escapeHtml(startLabel)}
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-direction:column">
        ${(state.origin && state.destination) ? `
          <button onclick="window.continueWithFacilityWaypoint()" style="background:#14b8a6;color:var(--bg);border:none;width:100%;padding:6px 10px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer">
            + Add as Waypoint to Trip
          </button>
        ` : ''}
        <a href="https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}" target="_blank" rel="noopener noreferrer" style="background:var(--border);color:#0284c7;border:1px solid #0284c744;padding:6px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:4px">
          ↗ Open in Google Maps
        </a>
      </div>
    </div>
  `;
  facilityTargetMarker.bindPopup(popupHtml).openPopup();

  // 2. PROMINENTLY PLACE START LOCATION MARKER ON MAP
  if (facilityStartMarker) {
    try { map.removeLayer(facilityStartMarker); } catch (_) {}
    facilityStartMarker = null;
  }

  const startPinText = isUserGps ? 'ME' : 'A';
  const startColor = isUserGps ? '#38bdf8' : 'var(--teal)';

  facilityStartMarker = L.marker([startLat, startLng], {
    icon: createPinIcon(startColor, startPinText),
    zIndexOffset: 2400
  }).addTo(map);

  facilityStartMarker.bindPopup(`
    <div style="font-family:Inter,sans-serif;padding:4px">
      <b style="color:${startColor};font-size:13px">📍 ${escapeHtml(startLabel)}</b>
      <div style="color:var(--muted);font-size:11px;margin-top:4px">Coordinates: ${startLat.toFixed(4)}, ${startLng.toFixed(4)}</div>
      <div style="color:var(--muted);font-size:10px;margin-top:2px">Departure point for facility directions</div>
    </div>
  `);

  // 3. RETRIEVE ROUTE VIA BACKEND PROXY OR LOCAL OSRM WITH FAILSAFE
  let route = null;

  try {
    const res = await api.calculateDirectRoute({
      start: { lat: startLat, lng: startLng, name: startLabel },
      destination: { lat: destLat, lng: destLng, name: facility.name },
      vehicleType: state.vehicleType || 'Truck'
    });
    if (res && res.route && res.route.geometry) {
      route = res.route;
    }
  } catch (_) {}

  // Fallback to client-side OSRM if backend route call had an issue
  if (!route) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const resp = await fetch(osrmUrl);
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        route = data.routes[0];
      }
    } catch (_) {}
  }

  // Failsafe geometric route so route line is ALWAYS displayed
  if (!route || !route.geometry) {
    const estSeconds = Math.max(60, Math.round((directDistMeters / 1000) / 40 * 3600));
    route = {
      distance: directDistMeters,
      duration: estSeconds,
      geometry: {
        type: 'LineString',
        coordinates: [
          [startLng, startLat],
          [destLng, destLat]
        ]
      },
      legs: [{
        distance: directDistMeters,
        duration: estSeconds,
        steps: [
          { distance: directDistMeters, maneuver: { type: 'depart' }, name: `Follow road towards ${facility.name}` }
        ]
      }]
    };
  }

  // 4. DRAW DETOUR ROUTE LAYER IN HIGH-VISIBILITY NEON ORANGE
  if (detourRouteLayer) {
    try { map.removeLayer(detourRouteLayer); } catch (_) {}
    detourRouteLayer = null;
  }

  if (mainRouteLayer) {
    mainRouteLayer.setStyle({ opacity: 0.25, weight: 4 });
  }

  detourRouteLayer = L.geoJSON(route.geometry, {
    style: {
      color: 'var(--orange)',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }
  }).addTo(map);

  // 5. FIT CAMERA BOUNDS TO BOTH START & FACILITY WITH GENEROUS PADDING
  try {
    const bounds = L.latLngBounds([
      [startLat, startLng],
      [destLat, destLng]
    ]);
    if (detourRouteLayer) {
      bounds.extend(detourRouteLayer.getBounds());
    }
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  } catch (_) {}

  // 6. FORMAT METRICS & UPDATE HUD
  const distNum = typeof route.distanceValue === 'number' ? route.distanceValue : (typeof route.distance === 'number' ? route.distance : directDistMeters);
  const durNum = typeof route.durationValue === 'number' ? route.durationValue : (typeof route.duration === 'number' ? route.duration : Math.round(distNum / 11));

  const distText = distNum >= 1000 ? `${(distNum / 1000).toFixed(1)} km` : `${Math.round(distNum)} m`;
  const durMins = Math.max(1, Math.round(durNum / 60));
  const durHours = Math.floor(durMins / 60);
  const durText = durHours > 0 ? `${durHours} hr ${durMins % 60} min` : `${durMins} min`;

  const infoEl = document.getElementById('facility-direction-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div>
          <b style="color:var(--orange);font-size:12px">${symbol} Directions to ${escapeHtml(facility.name)}</b>
          <div style="color:var(--muted);font-size:11px;margin-top:2px">
            From: <span style="color:${startColor};font-weight:600">${escapeHtml(startLabel)}</span>
          </div>
          <div style="color:var(--teal);font-size:11px;margin-top:2px;font-weight:600">
            📏 ${distText} · ⏱️ ${durText}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          ${isUserGps && state.selectedRoute?.origin?.lat ? `
            <button onclick="window.routeFacilityFrom('origin')" style="background:var(--card);color:var(--muted);border:1px solid #334155;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px" title="Show directions from trip origin instead">
              Trip Origin
            </button>
          ` : (!isUserGps && state.userLocation?.lat ? `
            <button onclick="window.routeFacilityFrom('gps')" style="background:var(--card);color:#0284c7;border:1px solid #0284c744;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px" title="Show directions from your current GPS location">
              📡 My GPS
            </button>
          ` : '')}
          <button onclick="window.continueWithFacilityWaypoint()" style="background:#14b8a6;color:var(--bg);border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold" title="Route: Origin -> Facility -> Final Destination">
            + Waypoint
          </button>
          <button onclick="window.returnToMainRoute()" style="background:var(--card);color:var(--teal);border:1px solid #14b8a6;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold">
            ✕ Exit
          </button>
          <a href="https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}" target="_blank" rel="noopener noreferrer" style="background:var(--border);color:#0284c7;border:1px solid #0284c744;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;gap:4px">
            ↗ Google Maps
          </a>
        </div>
      </div>
    `;
  }

  const listEl = document.getElementById('facility-directions-list');
  if (listEl) {
    const steps = route.steps || (route.legs?.[0]?.steps || []).map(formatStep);
    if (steps && steps.length > 0) {
      listEl.innerHTML = steps.map((step, idx) => {
        const stepText = typeof step === 'string' ? step : (step.name ? `${idx + 1}. Continue onto ${step.name}` : `${idx + 1}. Continue`);
        return `
          <div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #ffffff10;font-size:11px;color:var(--text)">
            <span>${escapeHtml(stepText)}</span>
          </div>
        `;
      }).join('');
    } else {
      listEl.innerHTML = `<div style="color:var(--muted);font-size:11px">Head towards ${escapeHtml(facility.name)} on highway corridor.</div>`;
    }
  }
}

window.routeFacilityFrom = (mode) => {
  if (state.selectedFacility) {
    displayFacilityRoute(state.selectedFacility, mode);
  }
};

/**
 * Calculates complete multi-stop journey: Origin -> Facility Waypoint -> Destination.
 */
export async function continueWithFacilityWaypoint() {
  const { notify } = await import('./render.js');
  if (!state.selectedFacility) return;
  if (!state.origin || !state.destination) {
    notify('Please plan a trip first before adding a waypoint.', 'warning');
    return;
  }
  notify(`Calculating journey via ${state.selectedFacility.name}…`, 'info');

  try {
    const data = await api.calculateWaypointRoute({
      origin: state.origin,
      waypoint: state.selectedFacility.coordinates,
      destination: state.destination,
      vehicleType: state.vehicleType || 'Heavy Truck'
    });

    if (data && data.route) {
      state.selectedRoute = data.route;
      displayRoute(data.route);

      const infoEl = document.getElementById('facility-direction-info');
      if (infoEl) {
        infoEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div>
              <b style="color:var(--teal)">Multi-stop Journey via ${escapeHtml(state.selectedFacility.name)}</b>
              <div style="color:var(--muted);font-size:11px">Total: ${data.route.distance} · ${data.route.duration}</div>
            </div>
            <button onclick="window.returnToMainRoute()" style="background:var(--card);color:var(--teal);border:1px solid #14b8a6;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold">
              ← Return to Direct Route
            </button>
          </div>
        `;
      }
      notify(`Journey updated via ${state.selectedFacility.name}!`, 'success');
      
      // Close popup to show the new route clearly
      if (facilityTargetMarker) {
        facilityTargetMarker.closePopup();
      }
    }
  } catch (err) {
    notify(err.message || 'Could not update multi-stop route.', 'error');
  }
}
window.continueWithFacilityWaypoint = continueWithFacilityWaypoint;

/**
 * Restores the original direct route and removes any detours and facility pins.
 */
export function returnToMainRoute() {
  if (detourRouteLayer) {
    try { map.removeLayer(detourRouteLayer); } catch (_) {}
    detourRouteLayer = null;
  }
  if (facilityTargetMarker) {
    try { map.removeLayer(facilityTargetMarker); } catch (_) {}
    facilityTargetMarker = null;
  }
  if (facilityStartMarker) {
    try { map.removeLayer(facilityStartMarker); } catch (_) {}
    facilityStartMarker = null;
  }
  state.selectedFacility = null;
  state._facilityRouteMode = null;
  state._facilityRoutePendingGps = false;

  if (state._originalMainRoute) {
    state.selectedRoute = state._originalMainRoute;
  }

  // Restore main route opacity & green styling
  if (mainRouteLayer) {
    mainRouteLayer.setStyle({ opacity: 0.95, weight: 6, color: '#10b981' });
    try { map.fitBounds(mainRouteLayer.getBounds(), { padding: [40, 40] }); } catch (_) {}
  }

  // Clear detour HUD
  const infoEl = document.getElementById('facility-direction-info');
  if (infoEl) infoEl.innerHTML = '';
  const listEl = document.getElementById('facility-directions-list');
  if (listEl) listEl.innerHTML = '';
}
window.returnToMainRoute = returnToMainRoute;

// Global hook for facility marker clicks
window.getDirectionsToFacility = async (id) => {
  const facility = (state.facilities || []).find(f => f.placeId === id || f.id === id);
  if (!facility) return;
  state.selectedFacility = facility;
  if (state.page !== 'Live Network') {
    const { go } = await import('./router.js');
    go('Live Network');
  } else {
    displayFacilityRoute(facility);
  }
};
window.displayFacilityRoute = displayFacilityRoute;

/**
 * Starts live high-accuracy GPS tracking with pulsating user marker.
 */
export function startUserLocationTracking() {
  if (!navigator.geolocation) {
    setLocationStatus('Geolocation is not supported by your browser.');
    return;
  }

  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
  }

  setLocationStatus('Connecting to GPS satellites…');

  locationWatchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 10);
      state.userLocation = { lat, lng };

      // Reactive update: if facility directions were requested and waiting for GPS, or actively in GPS mode
      if (state.selectedFacility && (state._facilityRoutePendingGps || state._facilityRouteMode === 'gps')) {
        state._facilityRoutePendingGps = false;
        displayFacilityRoute(state.selectedFacility, 'gps');
      } else if (state.selectedFacility && facilityStartMarker && state._facilityRouteMode === 'gps') {
        facilityStartMarker.setLatLng([lat, lng]);
      }

      if (map) {
        if (!userMarker) {
          const icon = L.divIcon({
            html: `
              <div class="gps-pulse-marker">
                <div class="gps-pulse-ring"></div>
                <div class="gps-pulse-circle"></div>
              </div>
            `,
            className: 'custom-gps-user-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
          userMarker.bindTooltip('Your Current Location', { direction: 'top', offset: [0, -12] });

          userAccuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#38bdf8',
            weight: 1,
            fillColor: '#38bdf8',
            fillOpacity: 0.1
          }).addTo(map);
        } else {
          userMarker.setLatLng([lat, lng]);
          if (userAccuracyCircle) {
            userAccuracyCircle.setLatLng([lat, lng]);
            userAccuracyCircle.setRadius(accuracy);
          }
        }
      }

      setLocationStatus(`Live GPS Active · accuracy ±${accuracy} m`);
      updateRemainingRouteProgress(lat, lng);
    },
    err => {
      const messages = {
        1: 'Location permission was denied. Please enable location access in browser settings.',
        2: 'GPS location is currently unavailable.',
        3: 'GPS request timed out.'
      };
      state.locationError = messages[err.code] || 'Could not retrieve GPS location.';
      setLocationStatus(state.locationError);
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

export function stopUserLocationTracking() {
  if (locationWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(locationWatchId);
  }
  locationWatchId = null;
}

function setLocationStatus(text) {
  const el = document.getElementById('location-status');
  if (el) el.textContent = text;
}

/**
 * Calculates remaining distance and ETA along the route geometry based on live user coordinates.
 */
function updateRemainingRouteProgress(userLat, userLng) {
  if (!state.selectedRoute?.geometry?.coordinates) return;
  const rawCoords = state.selectedRoute?.geometry?.coordinates || [];
  const coords = rawCoords.length <= 20
    ? rawCoords
    : Array.from({ length: 20 }, (_, i) => rawCoords[Math.round(i * (rawCoords.length - 1) / 19)]);
  if (coords.length < 2) return;

  // Find nearest point on route
  let closestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const ptLng = coords[i][0];
    const ptLat = coords[i][1];
    // Approximation in meters
    const d = Math.hypot((userLat - ptLat) * 111000, (userLng - ptLng) * 111000 * Math.cos(userLat * Math.PI / 180));
    if (d < minDistance) {
      minDistance = d;
      closestIdx = i;
    }
  }

  // Calculate remaining road distance
  let remainingMeters = 0;
  for (let i = closestIdx; i < coords.length - 1; i++) {
    const p1Lng = coords[i][0];
    const p1Lat = coords[i][1];
    const p2Lng = coords[i + 1][0];
    const p2Lat = coords[i + 1][1];
    remainingMeters += Math.hypot((p2Lat - p1Lat) * 111000, (p2Lng - p1Lng) * 111000 * Math.cos(p1Lat * Math.PI / 180));
  }

  const distText = remainingMeters >= 1000
    ? `${(remainingMeters / 1000).toFixed(1)} km`
    : `${Math.round(remainingMeters)} m`;

  const totalMeters = state.selectedRoute.distanceValue || 1;
  const totalSecs = state.selectedRoute.durationValue || 1;
  const remainingSecs = Math.max(60, Math.round((remainingMeters / totalMeters) * totalSecs));
  const hrs = Math.floor(remainingSecs / 3600);
  const mins = Math.round((remainingSecs % 3600) / 60);
  const etaText = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;

  state.remainingDistance = distText;
  state.remainingDuration = etaText;

  const distEl = document.getElementById('remaining-distance');
  if (distEl) distEl.textContent = distText;
  const etaEl = document.getElementById('remaining-eta');
  if (etaEl) etaEl.textContent = etaText;
}

/**
 * Adds alert hazard markers on the map.
 */
export function addAlertMarkers(alerts) {
  if (!alertMarkersGroup) return;
  alertMarkersGroup.clearLayers();
  if (!alerts || alerts.length === 0) return;

  const stateCoords = {
    Assam: [26.14, 91.74],
    'Arunachal Pradesh': [27.08, 93.61],
    Manipur: [24.66, 93.91],
    Meghalaya: [25.47, 91.37],
    Mizoram: [23.73, 92.72],
    Nagaland: [25.67, 94.11],
    Sikkim: [27.53, 88.51],
    Tripura: [23.75, 91.75]
  };

  const SEV_COLOR = {
    CRITICAL: '#ef4444',
    HIGH: 'var(--orange)',
    MEDIUM: '#fbbf24',
    LOW: 'var(--muted)'
  };

  alerts.forEach(alert => {
    let latLng = null;
    if (alert.coordinates?.lat && alert.coordinates?.lng) {
      latLng = [alert.coordinates.lat, alert.coordinates.lng];
    } else if (alert.state && stateCoords[alert.state]) {
      latLng = stateCoords[alert.state];
    }
    if (!latLng) return;

    const color = SEV_COLOR[alert.severity] || 'var(--orange)';
    const marker = L.circleMarker(latLng, {
      radius: 7,
      fillColor: color,
      color: '#ffffff',
      weight: 1.5,
      fillOpacity: 0.9
    });

    marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;max-width:240px">
        <b style="color:${color};font-size:12px">${escapeHtml(alert.severity)}: ${escapeHtml(alert.title)}</b>
        <div style="color:var(--muted);font-size:11px;margin-top:4px">${escapeHtml(alert.location || alert.state)}</div>
        ${alert.description ? `<p style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.4">${escapeHtml(alert.description)}</p>` : ''}
      </div>
    `);

    alertMarkersGroup.addLayer(marker);
  });
}

/**
 * Attaches debounced OSM / Photon location autocomplete dropdown to input elements.
 */
export function attachOSMAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input || input._hasOSMAutocomplete) return;
  input._hasOSMAutocomplete = true;

  // Wrap input in relative container
  let wrap = input.parentElement;
  if (!wrap.classList.contains('osm-autocomplete-wrap')) {
    wrap = document.createElement('div');
    wrap.className = 'osm-autocomplete-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'osm-suggestions-dropdown';
  dropdown.style.display = 'none';
  wrap.appendChild(dropdown);

  let debounceTimer = null;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearTimeout(debounceTimer);
    if (val.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const data = await api.suggestLocations(val);
        const suggestions = data.suggestions || [];
        if (suggestions.length === 0) {
          dropdown.style.display = 'none';
          return;
        }

        dropdown.innerHTML = suggestions.map(s => `
          <div class="osm-suggestion-item" data-label="${escapeHtml(s.label)}" data-lat="${s.lat}" data-lng="${s.lng}">
            <span class="pin-icon">📍</span>
            <div style="min-width:0;flex:1">
              <div class="item-title">${escapeHtml(s.name)}</div>
              <div class="item-sub">${escapeHtml(s.label)}</div>
            </div>
          </div>
        `).join('');

        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.osm-suggestion-item').forEach(el => {
          el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const label = el.getAttribute('data-label');
            const lat = parseFloat(el.getAttribute('data-lat'));
            const lng = parseFloat(el.getAttribute('data-lng'));
            input.value = label;
            dropdown.style.display = 'none';
            if (onSelect) onSelect(label, lat, lng);
          });
        });
      } catch (_) {
        dropdown.style.display = 'none';
      }
    }, 300);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 250);
  });
}

/**
 * Reverse geocodes coordinates via OSM / Nominatim.
 */
export async function reverseGeocodeOSM(lat, lng) {
  try {
    const data = await api.reverseGeocode(lat, lng);
    return data.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (_) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/**
 * Displays colored risk zone polylines along the route on the OpenStreetMap map.
 * Green = Low, Amber = Moderate, Orange = High, Red = Very High.
 */
export function displayRiskZoneOverlay(segments) {
  if (!map) return;
  if (!riskZonesLayerGroup) {
    riskZonesLayerGroup = L.layerGroup().addTo(map);
  }
  riskZonesLayerGroup.clearLayers();

  if (!segments || !Array.isArray(segments) || segments.length === 0) return;

  state.activeRiskSegments = segments;

  segments.forEach((seg, idx) => {
    if (!seg.coordinates || seg.coordinates.length < 2) return;

    // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
    const latLngs = seg.coordinates.map(c => [c[1], c[0]]);

    const polyline = L.polyline(latLngs, {
      color: seg.color || '#10b981',
      weight: 9,
      opacity: 0.88,
      lineCap: 'round',
      lineJoin: 'round'
    });

    const popupContent = `
      <div style="font-family:Inter,sans-serif;padding:6px;max-width:260px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;border-bottom:1px solid #334155;padding-bottom:4px">
          <b style="color:${seg.color};font-size:12px">Segment ${idx + 1}: ${escapeHtml(seg.name)}</b>
          <span style="background:${seg.color}25;color:${seg.color};border:1px solid ${seg.color}60;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">
            ${seg.riskLevel} (${seg.riskScore}%)
          </span>
        </div>
        <div style="margin-top:6px;font-size:11px;color:var(--text);font-weight:600">
          ${escapeHtml(seg.primaryHazardType)} Risk
        </div>
        <div style="margin-top:2px;font-size:11px;color:var(--muted);line-height:1.35">
          ${escapeHtml(seg.explanation)}
        </div>
        <div style="margin-top:6px;padding-top:4px;border-top:1px solid var(--border);font-size:10px;color:var(--muted)">
          <div>🌧️ Precip: <b style="color:var(--text)">${seg.currentConditions?.forecast_24h_mm || 0}mm (${seg.currentConditions?.precipitation_probability || 0}%)</b></div>
          <div>🏔️ Terrain: <b style="color:var(--text)">${escapeHtml(seg.terrain || 'N/A')}</b></div>
          <div>📍 State: <b style="color:var(--text)">${escapeHtml(seg.state || 'NER')}</b></div>
          <div style="margin-top:4px;color:var(--muted);font-size:9px">Source: ${escapeHtml(seg.currentConditions?.weatherDataSource || 'Open-Meteo')}</div>
        </div>
      </div>
    `;

    polyline.bindPopup(popupContent);
    riskZonesLayerGroup.addLayer(polyline);
  });
}
window.displayRiskZoneOverlay = displayRiskZoneOverlay;

/**
 * Focuses map camera on a specific risk segment.
 */
export function focusOnSegment(seg) {
  if (!map || !seg) return;
  if (seg.coordinates && seg.coordinates.length >= 2) {
    const latLngs = seg.coordinates.map(c => [c[1], c[0]]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    if (seg.midCoord) {
      L.popup()
        .setLatLng([seg.midCoord.lat, seg.midCoord.lng])
        .setContent(`
          <div style="font-family:Inter,sans-serif;padding:6px;max-width:240px">
            <b style="color:${seg.color};font-size:12px">${escapeHtml(seg.name)}: ${seg.riskLevel} (${seg.riskScore}%)</b>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${escapeHtml(seg.explanation)}</div>
          </div>
        `)
        .openOn(map);
    }
  }
}
window.focusOnSegment = focusOnSegment;

