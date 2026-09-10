// NER SmartLogix — Facilities page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

const TYPE_LABEL = {
  hospital: 'Hospital',
  lodging: 'Hotel / Lodge',
  gas_station: 'Petrol Pump',
  restaurant: 'Restaurant / Dhaba',
  pharmacy: 'Pharmacy',
  police: 'Police Station',
  parking: 'Parking',
  car_repair: 'Vehicle Repair',
  fire_station: 'Fire Station',
  atm: 'ATM',
  bank: 'Bank'
};

const TYPE_COLOR = {
  hospital: 'var(--red)',
  lodging: 'var(--orange)',
  gas_station: 'var(--teal)',
  restaurant: '#a78bfa',
  pharmacy: '#34d399',
  police: '#60a5fa',
  parking: '#94a3b8',
  car_repair: '#fbbf24',
  fire_station: '#f87171',
  atm: '#6ee7b7',
  bank: '#6ee7b7'
};

export async function loadFacilitiesPage() {
  if (!state.origin || !state.destination || !state.selectedRoute) return;
  if (state.facilities.length > 0) return; // Already loaded
  state.loadingFacilities = true;
  window.render();
  try {
    const data = await api.getFacilitiesNearRoute(state.origin, state.destination);
    state.facilities = data.facilities || [];
  } catch (err) {
    const { notify } = await import('../render.js');
    notify(err.message || 'Failed to load facilities.', 'error');
  }
  state.loadingFacilities = false;
  window.render();
}

export function renderFacilitiesPage() {
  const noRoute = !state.origin || !state.destination || !state.selectedRoute;

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Route-based facilities</div>
        <h2>${t('facilities.title')}</h2>
        <p class="desc">${t('facilities.subtitle')}</p>
      </div>
    </div>

    ${noRoute
      ? `<div class="empty">
           <div>
             <div style="font-size:38px;color:var(--teal)">◇</div>
             <b>${t('facilities.noRoute')}</b>
             <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
           </div>
         </div>`
      : state.loadingFacilities
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">⟳</div><b>${t('facilities.loading')}</b></div></div>`
      : state.facilities.length === 0
      ? `<div class="empty"><div><b>${t('facilities.noResults')}</b></div></div>`
      : `
        <div style="margin-bottom:16px;color:var(--muted);font-size:13px">
          Facilities along route: <b style="color:var(--text)">${esc(state.origin)} → ${esc(state.destination)}</b>
          <span class="badge" style="margin-left:10px">${state.facilities.length} found</span>
        </div>

        <div class="facilities">
          ${state.facilities.map((f, idx) => facilityCard(f, idx)).join('')}
        </div>`
    }
  </section>`;
}

function facilityCard(f, idx) {
  const label = TYPE_LABEL[f.facilityType] || f.facilityType || 'Facility';
  const color = TYPE_COLOR[f.facilityType] || 'var(--teal)';
  const distText = f.distanceMeters
    ? (f.distanceMeters >= 1000
        ? `${(f.distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(f.distanceMeters)} m`)
    : '';

  return `
  <div class="facility" style="cursor:pointer" onclick="selectFacility(${idx})" title="View on map">
    <div class="row">
      <div style="flex:1;min-width:0">
        <b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</b>
        <div class="muted" style="margin-top:3px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.address || '')}</div>
      </div>
      <span class="badge" style="color:${color};flex-shrink:0;margin-left:8px">${esc(label)}</span>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;align-items:center;flex-wrap:wrap">
      ${f.rating ? `<span class="muted" style="font-size:12px">⭐ ${f.rating}</span>` : ''}
      ${distText ? `<span class="muted" style="font-size:11px">📍 ${distText}</span>` : ''}
      ${f.openNow != null
        ? `<span class="badge ${f.openNow ? 'success' : 'warning'}">${f.openNow ? t('facilities.open') : t('facilities.closed')}</span>`
        : ''}
      <span class="badge info" style="margin-left:auto;cursor:pointer" onclick="event.stopPropagation();selectFacility(${idx})">Navigate →</span>
    </div>
  </div>`;
}

window.selectFacility = async (index) => {
  const facility = state.facilities[index];
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};
