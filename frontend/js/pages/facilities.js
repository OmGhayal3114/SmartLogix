// NER SmartLogix — Facilities Page (Route Corridor Accessibility)

import { state } from '../state.js';
import { t } from '../i18n.js';
import { api } from '../api.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

// 9 Core Accessibility & Road Safety Categories (ATM excluded)
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

const TYPE_COLOR = {
  hospital: 'var(--red)',
  pharmacy: '#38bdf8',
  police: '#60a5fa',
  gas_station: 'var(--teal)',
  lodging: 'var(--orange)',
  car_repair: '#fbbf24',
  parking: '#94a3b8',
  restaurant: '#a78bfa',
  restroom: '#2dd4bf'
};

function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function loadFacilitiesPage() {
  if (!state.origin || !state.destination || !state.selectedRoute) return;
  if (state.facilities && state.facilities.length > 0 && state._loadedRouteForFacilities === state.selectedRoute) return;

  state.loadingFacilities = true;
  state.facilitiesError = null;
  window.render();

  try {
    const rawCoords = state.selectedRoute?.geometry?.coordinates || [];
    const routeCoords = rawCoords.length <= 20
      ? rawCoords
      : Array.from({ length: 20 }, (_, i) => rawCoords[Math.round(i * (rawCoords.length - 1) / 19)]);

    const originCoords = state.selectedRoute?.origin || (rawCoords[0] ? { lat: rawCoords[0][1], lng: rawCoords[0][0] } : null);
    const destinationCoords = state.selectedRoute?.destination || (rawCoords.length ? { lat: rawCoords[rawCoords.length - 1][1], lng: rawCoords[rawCoords.length - 1][0] } : null);

    const data = await api.getFacilitiesNearRoute(state.origin, state.destination, routeCoords, {
      originCoords,
      destinationCoords,
      userLocation: state.userLocation
    });

    if (data && Array.isArray(data.facilities)) {
      // Filter out any ATM results
      state.facilities = data.facilities.filter(f => f.facilityType !== 'atm');
      state._loadedRouteForFacilities = state.selectedRoute;
    } else {
      state.facilities = [];
    }
  } catch (err) {
    console.warn('[Facilities] Error fetching places:', err.message);
    state.facilitiesError = 'Could not load facilities along this route. Please try again.';
  }

  state.loadingFacilities = false;
  window.render();
}

export function renderFacilitiesPage() {
  const noRoute = !state.origin || !state.destination || !state.selectedRoute;
  const filterCat = state.facilityFilter || 'all';
  const allList = (state.facilities || []).filter(f => f.facilityType !== 'atm');
  const displayFacilities = allList.filter(f => filterCat === 'all' || f.facilityType === filterCat);

  const countFor = (cat) => allList.filter(f => f.facilityType === cat).length;

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Route Accessibility</div>
        <h2>${t('facilities.title') || 'Nearby Route Facilities'}</h2>
        <p class="desc">Essential accessibility stops, emergency services, and repair facilities along your route corridor.</p>
      </div>
    </div>

    ${noRoute
      ? `<div class="empty">
           <div>
             <div style="font-size:38px;color:var(--teal)">⇄</div>
             <b>${t('facilities.noRoute') || 'Select a route first to see facilities along it.'}</b>
             <p class="muted" style="margin-top:8px">Plan a trip and choose a route to explore accessibility points along the road.</p>
             <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
           </div>
         </div>`
      : state.loadingFacilities
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">⟳</div><b>${t('facilities.loading') || 'Discovering facilities near your GPS position along corridor…'}</b></div></div>`
      : state.facilitiesError
      ? `<div class="empty">
           <div>
             <div style="font-size:32px;color:var(--red)">⚠</div>
             <b>${esc(state.facilitiesError)}</b>
             <div style="margin-top:12px">
               <button class="btn" onclick="loadFacilitiesPage()">Retry Facility Search</button>
             </div>
           </div>
         </div>`
      : allList.length === 0
      ? `<div class="empty">
           <div>
             <b>${t('facilities.noResults') || 'No nearby facilities found within 15 km of this corridor.'}</b>
             <div style="margin-top:12px">
               <button class="btn" onclick="loadFacilitiesPage()">Refresh</button>
             </div>
           </div>
         </div>`
      : `
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center;">
          <select style="background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px;"
                  onchange="state.facilityFilter=this.value;window.render()">
            <option value="all" ${filterCat === 'all' ? 'selected' : ''}>All Categories (${allList.length})</option>
            <option value="gas_station" ${filterCat === 'gas_station' ? 'selected' : ''}>⛽ Petrol Pumps (${countFor('gas_station')})</option>
            <option value="hospital" ${filterCat === 'hospital' ? 'selected' : ''}>🏥 Hospitals & Clinics (${countFor('hospital')})</option>
            <option value="pharmacy" ${filterCat === 'pharmacy' ? 'selected' : ''}>💊 Pharmacies & Medical (${countFor('pharmacy')})</option>
            <option value="police" ${filterCat === 'police' ? 'selected' : ''}>🚓 Police Stations (${countFor('police')})</option>
            <option value="lodging" ${filterCat === 'lodging' ? 'selected' : ''}>🏨 Hotels & Lodges (${countFor('lodging')})</option>
            <option value="car_repair" ${filterCat === 'car_repair' ? 'selected' : ''}>🔧 Vehicle Repair & Garages (${countFor('car_repair')})</option>
            <option value="parking" ${filterCat === 'parking' ? 'selected' : ''}>🅿️ Parking & Rest Areas (${countFor('parking')})</option>
            <option value="restaurant" ${filterCat === 'restaurant' ? 'selected' : ''}>🍽️ Restaurants & Dhabas (${countFor('restaurant')})</option>
            <option value="restroom" ${filterCat === 'restroom' ? 'selected' : ''}>🚻 Public Restrooms (${countFor('restroom')})</option>
          </select>
          <div style="color:var(--muted);font-size:13px;margin-left:auto;display:flex;align-items:center;gap:8px">
            ${state.userLocation ? `<span class="badge success" style="font-size:10px">📡 GPS Sorted</span>` : ''}
            <span>Corridor: <b style="color:var(--text)">${esc(state.origin)} → ${esc(state.destination)}</b></span>
            <span class="badge" style="margin-left:6px">${displayFacilities.length} places shown</span>
          </div>
        </div>

        <div class="facilities">
          ${displayFacilities.map((f, idx) => facilityCard(f, idx)).join('')}
        </div>`
    }
  </section>`;
}

function facilityCard(f) {
  const label = TYPE_LABEL[f.facilityType] || f.facilityType || 'Facility';
  const symbol = TYPE_SYMBOL[f.facilityType] || '📍';
  const color = TYPE_COLOR[f.facilityType] || 'var(--teal)';
  
  // Compute distance from user GPS if available
  let userDist = null;
  if (f.distanceFromUser != null) {
    userDist = f.distanceFromUser;
  } else if (state.userLocation && state.userLocation.lat && f.coordinates && f.coordinates.lat) {
    userDist = calculateDistance(state.userLocation.lat, state.userLocation.lng, f.coordinates.lat, f.coordinates.lng);
  }

  const userDistText = formatDistance(userDist);
  const corridorDistText = formatDistance(f.distanceMeters);

  const ratingText = f.rating
    ? `<span style="color:#fbbf24;font-size:12px;font-weight:600">★ ${f.rating.toFixed(1)} ${f.userRatingsTotal ? `<small style="color:var(--muted);font-weight:normal">(${f.userRatingsTotal})</small>` : ''}</span>`
    : '';

  const openStatus = f.openNow !== null && f.openNow !== undefined
    ? `<span style="font-size:11px;color:${f.openNow ? 'var(--green)' : 'var(--red)'}">● ${f.openNow ? 'Open' : 'Closed'}</span>`
    : '';

  return `
  <div class="facility" style="cursor:pointer" onclick="selectFacility('${f.placeId || f.id}')" title="Get GPS directions on map">
    <div class="row" style="align-items:flex-start">
      <div style="flex:1;min-width:0">
        <b style="font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f8fafc">
          <span style="margin-right:4px">${symbol}</span> ${esc(f.name)}
        </b>
        <div class="muted" style="margin-top:4px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.address || '')}</div>
      </div>
      <span class="badge" style="color:${color};background:${color}18;border:1px solid ${color}33;flex-shrink:0;margin-left:8px;font-size:11px">
        ${esc(label)}
      </span>
    </div>
    <div style="display:flex;gap:12px;margin-top:10px;align-items:center;flex-wrap:wrap">
      ${ratingText}
      ${openStatus}
      ${userDistText
        ? `<span class="badge" style="background:#0284c722;color:#38bdf8;border:1px solid #38bdf844;font-size:11px">📍 ${userDistText} from your GPS</span>`
        : (corridorDistText ? `<span class="muted" style="font-size:11px;color:var(--teal)">📍 ${corridorDistText} off route</span>` : '')
      }
      <span class="badge info" style="margin-left:auto;cursor:pointer;font-weight:600;padding:5px 12px;display:inline-flex;align-items:center;gap:4px" onclick="event.stopPropagation();selectFacility('${f.placeId || f.id}')">
        🧭 Navigate from GPS →
      </span>
    </div>
  </div>`;
}

window.selectFacility = async (id) => {
  const facility = (state.facilities || []).find(f => f.id === id || f.placeId === id);
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  const { notify } = await import('../render.js');
  notify(`Routing from your GPS to ${facility.name} on map…`, 'info');
  go('Live Network');
};
