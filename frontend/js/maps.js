// NER SmartLogix — Map integration (Google Maps + Dark Leaflet Fallback)

import { state } from './state.js';
import { api } from './api.js';

let activeEngine = 'none'; // 'google' | 'leaflet'
let googleMap = null;
let googleDirectionsRenderer = null;
let googleMarkers = [];

let leafletMap = null;
let leafletMarkers = [];
let leafletRouteLayer = null;

let lastContainerId = 'google-map';
let lastOrigin = '';
let lastDestination = '';
let pendingFacilities = [];
let pendingAlerts = [];

const NER_CITY_COORDS = {
  'guwahati': [26.1445, 91.7362],
  'shillong': [25.5788, 91.8933],
  'kohima': [25.6751, 94.1086],
  'dimapur': [25.9063, 93.7263],
  'imphal': [24.8170, 93.9368],
  'aizawl': [23.7307, 92.7173],
  'agartala': [23.8315, 91.2868],
  'itanagar': [27.0844, 93.6053],
  'gangtok': [27.3389, 88.6065],
  'silchar': [24.8333, 92.7789],
  'jorhat': [26.7465, 94.2026],
  'dibrugarh': [27.4728, 94.9120],
  'tezpur': [26.6338, 92.7931]
};

function getCoords(name) {
  const clean = (name || '').toLowerCase().trim();
  for (const [k, v] of Object.entries(NER_CITY_COORDS)) {
    if (clean.includes(k)) return v;
  }
  return [25.5, 92.5];
}

// Global hook: Google Maps calls this function if authentication/key fails
window.gm_authFailure = () => {
  console.warn('[Maps] Google Maps authentication failed. Activating high-performance dark fallback map.');
  initLeafletFallback(lastContainerId);
};

export async function loadGoogleMapsScript() {
  if (window.google && window.google.maps) return;

  try {
    if (!state.googleMapsKey) {
      const data = await api.getMapsKey();
      state.googleMapsKey = data.key;
    }

    if (!state.googleMapsKey || state.googleMapsKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      throw new Error('Key not configured');
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${state.googleMapsKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = (err) => {
        console.warn('[Maps] Google script loading failed, fallback will be used.');
        resolve(); // resolve so app continues with fallback
      };
      document.head.appendChild(script);
    });
  } catch (err) {
    console.warn('[Maps] Could not load Google Maps script:', err.message);
  }
}

export function initMap(containerId) {
  lastContainerId = containerId;
  const el = document.getElementById(containerId);
  if (!el) return null;

  // If Google Maps is successfully available and not failed:
  if (window.google && window.google.maps && typeof google.maps.Map === 'function') {
    try {
      googleMap = new google.maps.Map(el, {
        center: { lat: 25.5, lng: 92.5 },
        zoom: 7,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0b0f1a' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0f1a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#5eead4' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2dd4bf22' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d3748' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040a12' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#5eead444' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] }
        ]
      });

      googleDirectionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#5eead4',
          strokeWeight: 4,
          strokeOpacity: 0.85
        }
      });
      googleDirectionsRenderer.setMap(googleMap);

      activeEngine = 'google';
      return googleMap;
    } catch (e) {
      console.warn('[Maps] Google Map initialization error:', e);
      return initLeafletFallback(containerId);
    }
  } else {
    return initLeafletFallback(containerId);
  }
}

async function ensureLeafletLoaded() {
  if (window.L) return;

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initLeafletFallback(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return null;

  try {
    await ensureLeafletLoaded();
    if (!window.L) return null;

    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }

    el.innerHTML = ''; // Clean any broken Google Maps overlays

    leafletMap = L.map(containerId, {
      center: [25.5, 92.5],
      zoom: 7,
      zoomControl: true
    });

    // High-performance dark logistics tiles (No watermark, clean dark theme)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, HERE, Garmin, OpenStreetMap contributors',
      maxZoom: 16
    }).addTo(leafletMap);

    // Dark labels & highway reference overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16
    }).addTo(leafletMap);

    activeEngine = 'leaflet';

    // Replay pending items
    if (lastOrigin && lastDestination) {
      displayRoute(lastOrigin, lastDestination);
    }
    if (pendingFacilities.length > 0) {
      addFacilityMarkers(pendingFacilities);
    }
    if (pendingAlerts.length > 0) {
      addAlertMarkers(pendingAlerts);
    }

    return leafletMap;
  } catch (err) {
    console.error('[Maps] Leaflet fallback initialization failed:', err);
    return null;
  }
}

export function displayRoute(origin, destination) {
  lastOrigin = origin;
  lastDestination = destination;

  const c1 = getCoords(origin);
  const c2 = getCoords(destination);

  if (activeEngine === 'google' && googleMap && window.google) {
    try {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'IN'
      }, (result, status) => {
        if (status === 'OK') {
          googleDirectionsRenderer.setDirections(result);
        } else {
          console.warn('[Maps] Google directions status not OK:', status, '→ falling back to Leaflet');
          initLeafletFallback(lastContainerId);
        }
      });
      return;
    } catch (e) {
      console.warn('[Maps] Google Directions error:', e);
      initLeafletFallback(lastContainerId);
    }
  }

  // Leaflet Route display
  if (activeEngine === 'leaflet' && leafletMap && window.L) {
    if (leafletRouteLayer) {
      leafletMap.removeLayer(leafletRouteLayer);
    }

    // Midpoint curving for hill highway representation
    const midLat = (c1[0] + c2[0]) / 2 + 0.08;
    const midLng = (c1[1] + c2[1]) / 2 - 0.05;

    const latlngs = [c1, [midLat, midLng], c2];

    leafletRouteLayer = L.polyline(latlngs, {
      color: '#5eead4',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 8'
    }).addTo(leafletMap);

    // Origin Marker
    const startIcon = L.divIcon({
      className: 'route-marker start',
      html: '<div style="background:#5eead4;width:14px;height:14px;border-radius:50%;border:2px solid #0b0f1a;box-shadow:0 0 10px #5eead4"></div>',
      iconSize: [14, 14]
    });
    L.marker(c1, { icon: startIcon }).addTo(leafletMap).bindPopup(`<b>Origin:</b> ${origin}`);

    // Destination Marker
    const endIcon = L.divIcon({
      className: 'route-marker end',
      html: '<div style="background:#34d399;width:16px;height:16px;border-radius:50%;border:2px solid #0b0f1a;box-shadow:0 0 10px #34d399"></div>',
      iconSize: [16, 16]
    });
    L.marker(c2, { icon: endIcon }).addTo(leafletMap).bindPopup(`<b>Destination:</b> ${destination}`);

    leafletMap.fitBounds(L.latLngBounds([c1, c2]).pad(0.3));
  }
}

export function clearMarkers() {
  if (googleMarkers.length > 0) {
    googleMarkers.forEach(m => m.setMap(null));
    googleMarkers = [];
  }
  if (leafletMarkers.length > 0 && leafletMap) {
    leafletMarkers.forEach(m => leafletMap.removeLayer(m));
    leafletMarkers = [];
  }
  pendingFacilities = [];
  pendingAlerts = [];
}

export function addFacilityMarkers(facilities) {
  pendingFacilities = facilities || [];
  if (!facilities || facilities.length === 0) return;

  const typeColors = {
    hospital: '#ef4444',
    lodging: '#fb923c',
    gas_station: '#5eead4'
  };
  const typeLabel = { hospital: 'Hospital', lodging: 'Hotel', gas_station: 'Fuel Station' };

  if (activeEngine === 'google' && googleMap && window.google) {
    facilities.forEach(f => {
      if (!f.coordinates || f.coordinates.lat == null) return;
      const color = typeColors[f.facilityType] || '#94a3b8';
      const marker = new google.maps.Marker({
        position: { lat: f.coordinates.lat, lng: f.coordinates.lng },
        map: googleMap,
        title: f.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeWeight: 1,
          strokeColor: '#ffffff'
        }
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="background:#111827;color:#e8edf5;padding:10px;border-radius:8px;font-size:12px">
          <b style="color:#5eead4">${f.name}</b>
          <div style="color:#64748b;margin-top:4px">${typeLabel[f.facilityType] || f.facilityType}</div>
          <div style="margin-top:4px">${f.address || ''}</div>
          ${f.rating ? `<div style="margin-top:4px">⭐ ${f.rating}</div>` : ''}
        </div>`
      });
      marker.addListener('click', () => infoWindow.open(googleMap, marker));
      googleMarkers.push(marker);
    });
    return;
  }

  if (activeEngine === 'leaflet' && leafletMap && window.L) {
    facilities.forEach(f => {
      if (!f.coordinates || f.coordinates.lat == null) return;
      const color = typeColors[f.facilityType] || '#5eead4';
      const icon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>`,
        iconSize: [12, 12]
      });
      const marker = L.marker([f.coordinates.lat, f.coordinates.lng], { icon })
        .addTo(leafletMap)
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px">
            <b>${f.name}</b><br>
            <span style="color:${color}">${typeLabel[f.facilityType] || f.facilityType}</span><br>
            <small>${f.address || ''}</small>
            ${f.rating ? `<br>⭐ ${f.rating}` : ''}
          </div>
        `);
      leafletMarkers.push(marker);
    });
  }
}

export function addAlertMarkers(alerts) {
  pendingAlerts = alerts || [];
  if (!alerts || alerts.length === 0) return;

  const stateCoords = {
    'Assam': { lat: 26.14, lng: 91.74 },
    'Arunachal Pradesh': { lat: 27.08, lng: 93.61 },
    'Manipur': { lat: 24.66, lng: 93.91 },
    'Meghalaya': { lat: 25.47, lng: 91.37 },
    'Mizoram': { lat: 23.73, lng: 92.72 },
    'Nagaland': { lat: 25.67, lng: 94.11 },
    'Sikkim': { lat: 27.53, lng: 88.51 },
    'Tripura': { lat: 23.75, lng: 91.75 }
  };
  const severityColors = { CRITICAL: '#ef4444', HIGH: '#fb923c', MEDIUM: '#fbbf24', LOW: '#94a3b8' };

  if (activeEngine === 'google' && googleMap && window.google) {
    alerts.forEach(a => {
      const pos = (a.coordinates && a.coordinates.lat)
        ? { lat: a.coordinates.lat, lng: a.coordinates.lng }
        : stateCoords[a.state];
      if (!pos) return;

      const marker = new google.maps.Marker({
        position: pos,
        map: googleMap,
        title: a.title,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: severityColors[a.severity] || '#fb923c',
          fillOpacity: 0.9,
          strokeWeight: 1,
          strokeColor: '#ffffff'
        }
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="background:#111827;color:#e8edf5;padding:10px;border-radius:8px;font-size:12px">
          <b style="color:#fb923c">${a.title}</b>
          <div style="color:#64748b;margin-top:4px">${a.state} · ${a.severity}</div>
        </div>`
      });
      marker.addListener('click', () => infoWindow.open(googleMap, marker));
      googleMarkers.push(marker);
    });
    return;
  }

  if (activeEngine === 'leaflet' && leafletMap && window.L) {
    alerts.forEach(a => {
      const pos = (a.coordinates && a.coordinates.lat)
        ? [a.coordinates.lat, a.coordinates.lng]
        : (stateCoords[a.state] ? [stateCoords[a.state].lat, stateCoords[a.state].lng] : null);
      if (!pos) return;

      const color = severityColors[a.severity] || '#fb923c';
      const icon = L.divIcon({
        html: `<div style="background:${color};color:#000;font-weight:bold;font-size:10px;text-align:center;line-height:16px;width:16px;height:16px;border-radius:3px;box-shadow:0 0 8px ${color}">!</div>`,
        iconSize: [16, 16]
      });
      const marker = L.marker(pos, { icon })
        .addTo(leafletMap)
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px">
            <b style="color:${color}">${a.severity}: ${a.title}</b><br>
            <span>${a.state} · ${a.location || ''}</span>
          </div>
        `);
      leafletMarkers.push(marker);
    });
  }
}
