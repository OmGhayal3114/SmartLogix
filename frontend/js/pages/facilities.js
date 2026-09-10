// NER SmartLogix — Facilities Page (Google Places Accessibility)

import { state } from '../state.js';
import { t } from '../i18n.js';
import { api } from '../api.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

const TYPE_LABEL = {
  hospital: 'Hospital',
  lodging: 'Hotel / Lodge',
  gas_station: 'Petrol Pump',
  restaurant: 'Restaurant / Dhaba',
  car_repair: 'Vehicle Repair / Garage',
  atm: 'ATM',
  pharmacy: 'Pharmacy',
  police: 'Police Station',
  parking: 'Parking'
};

const TYPE_SYMBOL = {
  hospital: '🏥',
  lodging: '🏨',
  gas_station: '⛽',
  restaurant: '🍽️',
  car_repair: '🔧',
  atm: '🏧',
  pharmacy: '💊',
  police: '🚓',
  parking: '🅿️'
};

const TYPE_COLOR = {
  hospital: 'var(--red)',
  lodging: 'var(--orange)',
  gas_station: 'var(--teal)',
  restaurant: '#a78bfa',
  car_repair: '#fbbf24',
  atm: '#34d399',
  pharmacy: '#38bdf8',
  police: '#60a5fa',
  parking: '#94a3b8'
};

function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export async function loadFacilitiesPage() {
  if (!state.origin || !state.destination || !state.selectedRoute) return;
  if (state.facilities.length > 0 && state._loadedRouteForFacilities === state.selectedRoute) return;

  state.loadingFacilities = true;
  state.facilitiesError = null;
  window.render();

  try {
    const { searchFacilitiesAlongRoute } = await import('../maps.js');
    await searchFacilitiesAlongRoute(state.selectedRoute);

    if (!state.facilities || state.facilities.length === 0) {
      const data = await api.getFacilitiesNearRoute(state.origin, state.destination);
      if (data && data.facilities && data.facilities.length > 0) {
        state.facilities = data.facilities;
        state._loadedRouteForFacilities = state.selectedRoute;
      }
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
  const displayFacilities = (state.facilities || []).filter(f => filterCat === 'all' || f.facilityType === filterCat);

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Route Accessibility</div>
        <h2>${t('facilities.title')}</h2>
        <p class="desc">Useful accessibility stops and services located along your selected logistics corridor.</p>
      </div>
    </div>

    ${noRoute
      ? `<div class="empty">
           <div>
             <div style="font-size:38px;color:var(--teal)">⇄</div>
             <b>${t('facilities.noRoute')}</b>
             <p class="muted" style="margin-top:8px">Plan a trip and choose a route to explore accessibility points along the road.</p>
             <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
           </div>
         </div>`
      : state.loadingFacilities
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">⟳</div><b>${t('facilities.loading') || 'Discovering accessibility facilities along corridor…'}</b></div></div>`
      : state.facilitiesError
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--red)">⚠</div><b>${esc(state.facilitiesError)}</b></div></div>`
      : state.facilities.length === 0
      ? `<div class="empty"><div><b>${t('facilities.noResults') || 'No nearby facilities found within 15 km of this corridor.'}</b></div></div>`
      : `
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center;">
          <select style="background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px;"
                  onchange="state.facilityFilter=this.value;window.render()">
            <option value="all" ${filterCat === 'all' ? 'selected' : ''}>All Categories</option>
            <option value="gas_station" ${filterCat === 'gas_station' ? 'selected' : ''}>⛽ Petrol Pumps</option>
            <option value="hospital" ${filterCat === 'hospital' ? 'selected' : ''}>🏥 Hospitals</option>
            <option value="lodging" ${filterCat === 'lodging' ? 'selected' : ''}>🏨 Hotels & Lodges</option>
            <option value="car_repair" ${filterCat === 'car_repair' ? 'selected' : ''}>🔧 Vehicle Repair & Garages</option>
            <option value="parking" ${filterCat === 'parking' ? 'selected' : ''}>🅿️ Parking</option>
            <option value="restaurant" ${filterCat === 'restaurant' ? 'selected' : ''}>🍴 Restaurants & Dhabas</option>
            <option value="restroom" ${filterCat === 'restroom' ? 'selected' : ''}>🚻 Restrooms</option>
          </select>
          <div style="color:var(--muted);font-size:13px;margin-left:auto;">
            Corridor: <b style="color:var(--text)">${esc(state.origin)} → ${esc(state.destination)}</b>
            <span class="badge" style="margin-left:10px">${displayFacilities.length} places found</span>
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
  const distText = formatDistance(f.distanceMeters);

  const ratingText = f.rating
    ? `<span style="color:#fbbf24;font-size:12px;font-weight:600">★ ${f.rating.toFixed(1)} ${f.userRatingsTotal ? `<small style="color:var(--muted);font-weight:normal">(${f.userRatingsTotal})</small>` : ''}</span>`
    : '';

  const openStatus = f.openNow !== null
    ? `<span style="font-size:11px;color:${f.openNow ? 'var(--green)' : 'var(--red)'}">● ${f.openNow ? 'Open' : 'Closed'}</span>`
    : '';

  return `
  <div class="facility" style="cursor:pointer" onclick="selectFacility('${f.placeId || f.id}')" title="View directions on map">
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
      ${distText ? `<span class="muted" style="font-size:11px;color:var(--teal)">📍 ${distText} off route</span>` : ''}
      <span class="badge info" style="margin-left:auto;cursor:pointer;font-weight:600;padding:4px 10px" onclick="event.stopPropagation();selectFacility('${f.placeId || f.id}')">
        🧭 Get Directions →
      </span>
    </div>
  </div>`;
}

window.selectFacility = async (id) => {
  const facility = (state.facilities || []).find(f => f.id === id || f.placeId === id);
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};
