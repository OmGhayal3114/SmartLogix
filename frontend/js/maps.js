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
let locationWatchId = null;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
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
    color:#040a12;
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
 * Initializes interactive OpenStreetMap inside container using Leaflet.
 * Detects if Leaflet is already mounted on the same DOM element and reuses
 * it — prevents the map from going blank when window.render() is called.
 */
export async function initMap(containerId = 'osm-map') {
  let element = document.getElementById(containerId);
  if (!element) {
    element = document.getElementById('google-map') || document.getElementById('map');
  }
  if (!element) return null;

  await ensureLeafletLoaded();

  // If Leaflet is already mounted on this exact DOM element, reuse it.
  // This prevents the map from going blank after window.render() re-creates the div.
  if (map && element._leaflet_id) {
    try {
      map.invalidateSize(true);
      // Restore layers if they were lost
      if (mainRouteLayer && !map.hasLayer(mainRouteLayer)) mainRouteLayer.addTo(map);
      if (facilityMarkersGroup && !map.hasLayer(facilityMarkersGroup)) facilityMarkersGroup.addTo(map);
      if (alertMarkersGroup && !map.hasLayer(alertMarkersGroup)) alertMarkersGroup.addTo(map);
    } catch (_) {}
    return map;
  }

  // DOM was re-rendered — clean up stale instance and create fresh map
  if (map) {
    try { map.remove(); } catch (_) {}
    map = null;
  }
  // Clear any leftover Leaflet markup from a stale instance
  element.innerHTML = '';
  delete element._leaflet_id;

  // Default center: Guwahati, Assam (Logistics gateway of North Eastern Region)
  const defaultCenter = [26.14, 91.74];

  map = L.map(element, {
    center: defaultCenter,
    zoom: 7,
    zoomControl: false // custom position
  });


  // Official OpenStreetMap tiles (natural green landscape, zero API key required)
  const osmTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Force Leaflet to recalculate container size (fixes blank map on first load)
  setTimeout(() => { try { map.invalidateSize(true); } catch(_) {} }, 50);
  setTimeout(() => { try { map.invalidateSize(true); } catch(_) {} }, 300);

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
            <b style="color:#5eead4;font-size:12px">Selected Point</b>
            <div style="color:#cbd5e1;font-size:11px;margin:4px 0">${escapeHtml(addr)}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="window.setMapLocationAs('origin', '${escapeHtml(addr)}', ${lat}, ${lng})" style="background:#14b8a6;color:#040a12;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">Set as Origin</button>
              <button onclick="window.setMapLocationAs('dest', '${escapeHtml(addr)}', ${lat}, ${lng})" style="background:#0f172a;color:#5eead4;border:1px solid #14b8a6;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">Set as Dest</button>
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
    map.fitBounds(mainRouteLayer.getBounds(), { padding: [40, 40] });
  } catch (_) {}

  // Coordinates: GeoJSON format [lng, lat]
  const coords = route.geometry.coordinates || [];
  if (coords.length >= 2) {
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    originMarker = L.marker([startCoord[1], startCoord[0]], {
      icon: createPinIcon('#5eead4', 'A')
    }).addTo(map).bindPopup(`
      <div style="font-family:Inter,sans-serif">
        <b style="color:#5eead4;font-size:12px">Origin:</b>
        <div style="color:#f8fafc;font-size:12px;margin-top:2px">${escapeHtml(route.startAddress || state.origin)}</div>
      </div>
    `);

    destinationMarker = L.marker([endCoord[1], endCoord[0]], {
      icon: createPinIcon('#34d399', 'B')
    }).addTo(map).bindPopup(`
      <div style="font-family:Inter,sans-serif">
        <b style="color:#34d399;font-size:12px">Destination:</b>
        <div style="color:#f8fafc;font-size:12px;margin-top:2px">${escapeHtml(route.endAddress || state.destination)}</div>
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

  const TYPE_COLOR = {
    hospital: '#ef4444',
    pharmacy: '#38bdf8',
    police: '#60a5fa',
    atm: '#34d399',
    gas_station: '#5eead4',
    lodging: '#fb923c',
    car_repair: '#fbbf24',
    parking: '#94a3b8',
    restaurant: '#a78bfa',
    restroom: '#2dd4bf'
  };

  const TYPE_SYMBOL = {
    hospital: '🏥',
    pharmacy: '💊',
    police: '🚓',
    atm: '🏧',
    gas_station: '⛽',
    lodging: '🏨',
    car_repair: '🔧',
    parking: '🅿️',
    restaurant: '🍴',
    restroom: '🚻'
  };

  const TYPE_LABEL = {
    hospital: 'Hospital / Clinic',
    pharmacy: 'Pharmacy / Medical',
    police: 'Police Station',
    atm: 'ATM / Banking',
    gas_station: 'Petrol Pump',
    lodging: 'Hotel / Lodge',
    car_repair: 'Vehicle Repair / Garage',
    parking: 'Parking & Rest Area',
    restaurant: 'Restaurant / Dhaba',
    restroom: 'Public Restroom'
  };

  facilities.forEach(f => {
    if (!f.coordinates || !f.coordinates.lat || !f.coordinates.lng) return;

    const color = TYPE_COLOR[f.facilityType] || '#14b8a6';
    const symbol = TYPE_SYMBOL[f.facilityType] || '📍';
    const label = TYPE_LABEL[f.facilityType] || f.facilityType;

    const marker = L.marker([f.coordinates.lat, f.coordinates.lng], {
      icon: createFacilityIcon(color, symbol)
    });

    const distText = f.distanceMeters >= 1000
      ? `${(f.distanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(f.distanceMeters || 0)} m`;

    const details = [];
    if (f.brand) details.push(`<span style="color:#5eead4">Brand: ${escapeHtml(f.brand)}</span>`);
    if (f.openingHours) details.push(`<span style="color:#cbd5e1">Hours: ${escapeHtml(f.openingHours)}</span>`);
    if (f.phone) details.push(`<span style="color:#cbd5e1">Phone: ${escapeHtml(f.phone)}</span>`);
    if (f.website) details.push(`<a href="${escapeHtml(f.website)}" target="_blank" style="color:#5eead4">Website ↗</a>`);

    const popupContent = `
      <div style="font-family:Inter,sans-serif;min-width:220px;max-width:280px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <strong style="font-size:14px;color:#f8fafc;line-height:1.3">${escapeHtml(f.name)}</strong>
          <span style="font-size:10px;font-weight:bold;background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 6px;border-radius:4px;white-space:nowrap">${escapeHtml(label)}</span>
        </div>
        <div style="color:#94a3b8;font-size:11px;margin-top:6px;line-height:1.4">${escapeHtml(f.address)}</div>
        <div style="color:#5eead4;font-size:11px;margin-top:4px">📍 ${distText} off route corridor</div>
        ${details.length > 0 ? `<div style="font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #ffffff15;display:flex;flex-direction:column;gap:3px">${details.join('')}</div>` : ''}
        <div style="margin-top:12px">
          <button onclick="window.getDirectionsToFacility('${f.placeId || f.id}')" style="background:#14b8a6;color:#040a12;border:none;width:100%;padding:7px 12px;border-radius:6px;font-weight:bold;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
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
 * Calculates road detour route to a selected facility.
 * Uses current user GPS direction / position when available, falling back to trip corridor origin.
 */
export async function displayFacilityRoute(facility) {
  if (!map || !facility?.coordinates) return;

  // Save original route if not already saved
  if (!state._originalMainRoute && state.selectedRoute) {
    state._originalMainRoute = state.selectedRoute;
  }
  state.selectedFacility = facility;

  const destLat = facility.coordinates.lat;
  const destLng = facility.coordinates.lng;

  // Prioritize current user GPS direction/position if active
  let startLat = null;
  let startLng = null;
  let startLabel = 'Current Location';
  let isUserGps = false;

  if (state.userLocation && state.userLocation.lat && state.userLocation.lng) {
    startLat = state.userLocation.lat;
    startLng = state.userLocation.lng;
    startLabel = 'Your Current GPS Location';
    isUserGps = true;
  } else if (state.selectedRoute?.origin?.lat) {
    startLat = state.selectedRoute.origin.lat;
    startLng = state.selectedRoute.origin.lng;
    startLabel = state.selectedRoute.startAddress || state.origin || 'Trip Origin';
  } else if (state.selectedRoute?.geometry?.coordinates?.[0]) {
    startLat = state.selectedRoute.geometry.coordinates[0][1];
    startLng = state.selectedRoute.geometry.coordinates[0][0];
    startLabel = state.selectedRoute.startAddress || state.origin || 'Corridor Origin';
  }

  if (!startLat || !startLng) return;

  try {
    let route = null;

    // 1. Try road route from start point
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const resp = await fetch(osrmUrl);
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        route = data.routes[0];
      }
    } catch (_) {}

    // 2. If GPS is remote / cross-continent where OSRM cannot connect, fall back to trip origin
    if (!route && isUserGps && state.selectedRoute?.origin?.lat) {
      startLat = state.selectedRoute.origin.lat;
      startLng = state.selectedRoute.origin.lng;
      startLabel = state.selectedRoute.startAddress || state.origin || 'Trip Origin';

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
      const resp = await fetch(osrmUrl);
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
        route = data.routes[0];
      }
    }

    if (!route || !route.geometry) {
      throw new Error('No drivable road route found to this facility.');
    }

    // Remove previous detour line
    if (detourRouteLayer) {
      map.removeLayer(detourRouteLayer);
      detourRouteLayer = null;
    }

    // Dim main route for clear visual focus on the facility route
    if (mainRouteLayer) {
      mainRouteLayer.setStyle({ opacity: 0.25, weight: 4 });
    }

    // Draw detour route in vibrant high-visibility orange
    detourRouteLayer = L.geoJSON(route.geometry, {
      style: {
        color: '#fb923c',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }).addTo(map);

    // Fit view to detour route with comfortable padding
    map.fitBounds(detourRouteLayer.getBounds(), { padding: [50, 50] });

    // Open popup for the target facility marker
    if (facilityMarkersGroup) {
      facilityMarkersGroup.eachLayer(layer => {
        const pos = layer.getLatLng && layer.getLatLng();
        if (pos && Math.abs(pos.lat - destLat) < 0.0008 && Math.abs(pos.lng - destLng) < 0.0008) {
          layer.openPopup();
        }
      });
    }

    // Format metrics
    const distText = route.distance >= 1000
      ? `${(route.distance / 1000).toFixed(1)} km`
      : `${Math.round(route.distance)} m`;
    const durMins = Math.max(1, Math.round(route.duration / 60));
    const durHours = Math.floor(durMins / 60);
    const durText = durHours > 0 ? `${durHours} hr ${durMins % 60} min` : `${durMins} min`;

    // Update HUD
    const infoEl = document.getElementById('facility-direction-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div>
            <b style="color:#fb923c">🧭 Route to ${escapeHtml(facility.name)}</b>
            <div style="color:#cbd5e1;font-size:11px">
              From: <span style="color:#5eead4">${escapeHtml(startLabel)}</span> · ${distText} · ${durText}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            <button onclick="window.continueWithFacilityWaypoint()" style="background:#14b8a6;color:#040a12;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold" title="Route: Origin -> Facility -> Final Destination">
              + Add as Waypoint
            </button>
            <button onclick="window.returnToMainRoute()" style="background:#0f172a;color:#5eead4;border:1px solid #14b8a6;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold">
              ← Direct Route
            </button>
            <a href="https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}" target="_blank" rel="noopener noreferrer" style="background:#1e293b;color:#38bdf8;border:1px solid #38bdf844;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;gap:4px">
              ↗ Google Maps
            </a>
          </div>
        </div>
      `;
    }

    const listEl = document.getElementById('facility-directions-list');
    if (listEl) {
      const steps = route.legs?.[0]?.steps || [];
      listEl.innerHTML = steps.map((step, idx) => {
        const stepDist = step.distance >= 1000
          ? `${(step.distance / 1000).toFixed(1)} km`
          : `${Math.round(step.distance || 0)} m`;
        const man = step.maneuver || {};
        const road = step.name ? ` onto ${escapeHtml(step.name)}` : '';
        const act = man.type === 'depart' ? 'Depart' : man.type === 'arrive' ? 'Arrive at destination' : (man.type || 'Continue');
        return `
          <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #ffffff10;font-size:11px">
            <b style="color:#fb923c;min-width:38px">${stepDist}</b>
            <span>${idx + 1}. ${act}${road}</span>
          </div>
        `;
      }).join('') || '<div style="color:#94a3b8">Turn guidance ready.</div>';
    }
  } catch (err) {
    const infoEl = document.getElementById('facility-direction-info');
    if (infoEl) infoEl.textContent = `Could not calculate directions to ${facility.name}.`;
  }
}

/**
 * Calculates complete multi-stop journey: Origin -> Facility Waypoint -> Destination.
 */
export async function continueWithFacilityWaypoint() {
  if (!state.selectedFacility || !state.origin || !state.destination) return;
  const { notify } = await import('./render.js');
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
              <b style="color:#5eead4">Multi-stop Journey via ${escapeHtml(state.selectedFacility.name)}</b>
              <div style="color:#cbd5e1;font-size:11px">Total: ${data.route.distance} · ${data.route.duration}</div>
            </div>
            <button onclick="window.returnToMainRoute()" style="background:#0f172a;color:#5eead4;border:1px solid #14b8a6;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold">
              ← Return to Direct Route
            </button>
          </div>
        `;
      }
      notify(`Journey updated via ${state.selectedFacility.name}!`, 'success');
    }
  } catch (err) {
    notify(err.message || 'Could not update multi-stop route.', 'error');
  }
}
window.continueWithFacilityWaypoint = continueWithFacilityWaypoint;

/**
 * Restores the original direct route and removes any detours.
 */
export function returnToMainRoute() {
  if (detourRouteLayer) {
    map.removeLayer(detourRouteLayer);
    detourRouteLayer = null;
  }
  state.selectedFacility = null;
  if (state._originalMainRoute) {
    state.selectedRoute = state._originalMainRoute;
  }

  // Restore main route opacity & green styling
  if (mainRouteLayer) {
    mainRouteLayer.setStyle({ opacity: 0.95, weight: 6, color: '#10b981' });
    map.fitBounds(mainRouteLayer.getBounds(), { padding: [40, 40] });
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
    HIGH: '#fb923c',
    MEDIUM: '#fbbf24',
    LOW: '#94a3b8'
  };

  alerts.forEach(alert => {
    let latLng = null;
    if (alert.coordinates?.lat && alert.coordinates?.lng) {
      latLng = [alert.coordinates.lat, alert.coordinates.lng];
    } else if (alert.state && stateCoords[alert.state]) {
      latLng = stateCoords[alert.state];
    }
    if (!latLng) return;

    const color = SEV_COLOR[alert.severity] || '#fb923c';
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
        <div style="color:#94a3b8;font-size:11px;margin-top:4px">${escapeHtml(alert.location || alert.state)}</div>
        ${alert.description ? `<p style="font-size:11px;color:#cbd5e1;margin-top:6px;line-height:1.4">${escapeHtml(alert.description)}</p>` : ''}
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
        <div style="margin-top:6px;font-size:11px;color:#f8fafc;font-weight:600">
          ${escapeHtml(seg.primaryHazardType)} Risk
        </div>
        <div style="margin-top:2px;font-size:11px;color:#cbd5e1;line-height:1.35">
          ${escapeHtml(seg.explanation)}
        </div>
        <div style="margin-top:6px;padding-top:4px;border-top:1px solid #1e293b;font-size:10px;color:#94a3b8">
          <div>🌧️ Precip: <b style="color:#f8fafc">${seg.currentConditions?.forecast_24h_mm || 0}mm (${seg.currentConditions?.precipitation_probability || 0}%)</b></div>
          <div>🏔️ Terrain: <b style="color:#f8fafc">${escapeHtml(seg.terrain || 'N/A')}</b></div>
          <div>📍 State: <b style="color:#f8fafc">${escapeHtml(seg.state || 'NER')}</b></div>
          <div style="margin-top:4px;color:#64748b;font-size:9px">Source: ${escapeHtml(seg.currentConditions?.weatherDataSource || 'Open-Meteo')}</div>
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
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px">${escapeHtml(seg.explanation)}</div>
          </div>
        `)
        .openOn(map);
    }
  }
}
window.focusOnSegment = focusOnSegment;

