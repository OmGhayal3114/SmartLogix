// NER SmartLogix — My Trip page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export async function loadMyTrips() {
  if (!state.user || !state.token) return;
  state.loadingTrips = true;
  window.render();
  try {
    const data = await api.getMyTrips(state.token);
    state.myTrips = data.trips || [];
  } catch (err) {
    const { notify } = await import('../render.js');
    notify(err.message || 'Failed to load trips.', 'error');
  }
  state.loadingTrips = false;
  window.render();
}

export function renderMyTripPage() {
  if (!state.user) {
    return `
    <section class="content">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--teal)">Journey management</div>
          <h2>${t('mytrip.title')}</h2>
        </div>
      </div>
      <div class="empty">
        <div>
          <div style="font-size:38px;color:var(--teal)">▣</div>
          <b>${t('mytrip.loginRequired')}</b>
          <button class="btn primary" style="margin-top:15px" onclick="openAuth('login')">Login</button>
        </div>
      </div>
    </section>`;
  }

  const u = state.user;
  const riskCls = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', UNKNOWN: '' };

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Journey management</div>
        <h2>${t('mytrip.title')}</h2>
        <p class="desc">${t('mytrip.subtitle')}</p>
      </div>
    </div>

    <div class="grid two">

      <!-- Profile Card -->
      <div class="card" style="max-width:320px">
        <div class="eyebrow" style="color:var(--teal);margin-bottom:12px">${t('mytrip.userDetails')}</div>
        <div class="detail-grid" style="grid-template-columns:1fr">
          <div><small>${t('mytrip.name')}</small><strong style="display:block;margin-top:5px">${esc(u.name)}</strong></div>
          <div><small>${t('mytrip.email')}</small><strong style="display:block;margin-top:5px">${esc(u.email)}</strong></div>
          ${u.phone ? `<div><small>${t('mytrip.phone')}</small><strong style="display:block;margin-top:5px">${esc(u.phone)}</strong></div>` : ''}
        </div>
        <button class="btn" style="margin-top:16px;width:100%" onclick="handleLogout()">Logout</button>
      </div>

      <!-- Trip History -->
      <div>
        <div class="eyebrow" style="color:var(--teal);margin-bottom:12px">Trip History</div>
        ${state.loadingTrips
          ? `<div style="color:var(--muted)">Loading trips...</div>`
          : state.myTrips.length === 0
          ? `<div class="empty"><div>
               <b>${t('mytrip.noTrips')}</b>
               <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
             </div></div>`
          : state.myTrips.map(trip => tripCard(trip, riskCls)).join('')
        }
      </div>

    </div>

    ${state.selectedTrip ? tripDetail(state.selectedTrip) : ''}

  </section>`;
}

function tripCard(trip, riskCls) {
  const dateStr = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return `
  <button class="trip" onclick="selectTrip('${esc(trip._id)}')">
    <div class="row">
      <b class="small">${esc(trip.tripId || trip._id)}</b>
      <span class="badge ${riskCls[trip.riskLevel] || ''}">${esc(trip.riskLevel)}</span>
    </div>
    <div class="row" style="margin-top:6px">
      <span class="small">${esc(trip.origin)} → ${esc(trip.destination)}</span>
      <span class="muted">${dateStr}</span>
    </div>
    <div class="muted" style="margin-top:6px;font-size:11px">
      ${esc(trip.vehicleType)} · ${esc(trip.distance || 'N/A')} · ${esc(trip.estimatedTime || 'N/A')}
    </div>
  </button>`;
}

function tripDetail(trip) {
  const riskColor = trip.riskLevel === 'HIGH' ? 'var(--red)' : trip.riskLevel === 'MEDIUM' ? 'var(--orange)' : 'var(--green)';
  const dateStr = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return `
  <div class="detail" style="margin-top:24px">
    <div class="row">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Trip Detail</div>
        <h2 style="margin-top:5px">${esc(trip.tripId || trip._id)}</h2>
      </div>
      <button class="link" onclick="state.selectedTrip=null;window.render()">✕ Close</button>
    </div>

    <div class="detail-grid" style="margin-top:16px">
      <div><small>Origin</small><strong style="display:block;margin-top:5px">${esc(trip.origin)}</strong></div>
      <div><small>Destination</small><strong style="display:block;margin-top:5px">${esc(trip.destination)}</strong></div>
      <div><small>Vehicle</small><strong style="display:block;margin-top:5px">${esc(trip.vehicleType)}</strong></div>
      <div><small>Distance</small><strong style="display:block;margin-top:5px">${esc(trip.distance || 'N/A')}</strong></div>
      <div><small>Est. Time</small><strong style="display:block;margin-top:5px">${esc(trip.estimatedTime || 'N/A')}</strong></div>
      <div><small>Risk Level</small><strong style="display:block;margin-top:5px;color:${riskColor}">${esc(trip.riskLevel)}</strong></div>
      <div><small>Status</small><strong style="display:block;margin-top:5px">${esc(trip.status)}</strong></div>
      <div><small>Date</small><strong style="display:block;margin-top:5px">${dateStr}</strong></div>
    </div>

    ${trip.riskReason ? `<p class="desc" style="margin-top:14px">${esc(trip.riskReason)}</p>` : ''}

    <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
      <button class="btn primary" onclick="go('Plan Trip')">Plan Similar Trip</button>
      <button class="btn" style="color:var(--red)" onclick="deleteMyTrip('${esc(trip._id)}')">Delete Trip</button>
    </div>
  </div>`;
}

window.selectTrip = (id) => {
  const trip = state.myTrips.find(t => t._id === id || t.tripId === id);
  if (trip) { state.selectedTrip = trip; window.render(); }
};

window.deleteMyTrip = async (id) => {
  if (!state.token) return;
  const { notify } = await import('../render.js');
  try {
    await api.deleteTrip(id, state.token);
    state.myTrips = state.myTrips.filter(t => t._id !== id);
    state.selectedTrip = null;
    notify('Trip deleted successfully.', 'success');
    window.render();
  } catch (err) {
    notify(err.message || 'Failed to delete trip.', 'error');
  }
};
