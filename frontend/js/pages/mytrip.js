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
      <div class="hero">
        <div class="hero-eyebrow">Journey Management</div>
        <h1 class="hero-title">${t('mytrip.title')}</h1>
        <p class="hero-sub">Track, review, and manage all your NER logistics journeys in one place.</p>
        <div class="hero-actions">
          <span class="badge info">Authentication Required</span>
        </div>
      </div>
      <div class="content-body">
        <div class="empty">
          <div>
            <div class="empty-icon">▣</div>
            <b>${t('mytrip.loginRequired')}</b>
            <p class="muted" style="margin-top:8px">Sign in to access your saved trip history and user profile.</p>
            <button class="btn primary" style="margin-top:18px;padding:12px 24px" onclick="openAuth('login')">Sign In to Continue →</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  const u = state.user;
  const riskCls = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', UNKNOWN: '' };
  const completedTrips = state.myTrips.filter(t => t.status === 'completed' || t.status === 'COMPLETED').length;
  const initial = (u.name || '?')[0].toUpperCase();

  return `
  <section class="content">

    <!-- Hero -->
    <div class="hero">
      <div class="hero-eyebrow">Journey Management</div>
      <h1 class="hero-title">${t('mytrip.title')}</h1>
      <p class="hero-sub">${t('mytrip.subtitle')}</p>
      <div class="hero-actions">
        <span class="badge success">● Active Driver Profile</span>
        <span class="badge info">${state.myTrips.length} Saved Journeys</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">▣</div>
        <div class="stat-value" data-count="${state.myTrips.length}">${state.myTrips.length}</div>
        <div class="stat-label">Total Trips</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green)">
        <div class="stat-icon">✓</div>
        <div class="stat-value" data-count="${completedTrips}">${completedTrips}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--red)">
        <div class="stat-icon">⚠</div>
        <div class="stat-value">${state.myTrips.filter(t => t.riskLevel === 'HIGH').length}</div>
        <div class="stat-label">High Risk</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--blue)">
        <div class="stat-icon">🚛</div>
        <div class="stat-value">${state.vehicleType || 'Truck'}</div>
        <div class="stat-label">Default Vehicle</div>
      </div>
    </div>

    <div class="content-body">
      <div class="grid two">

        <!-- Profile Card -->
        <div class="card" style="max-width:340px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#5eead430,#2dd4bf20);border:2px solid #5eead440;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--teal);flex-shrink:0">${initial}</div>
            <div>
              <div style="font-size:15px;font-weight:700">${esc(u.name)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(u.email)}</div>
            </div>
          </div>

          <div class="divider" style="margin:0 0 16px"></div>

          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <div class="eyebrow">Name</div>
              <div style="margin-top:3px;font-weight:600">${esc(u.name)}</div>
            </div>
            <div>
              <div class="eyebrow">Email</div>
              <div style="margin-top:3px;font-weight:600">${esc(u.email)}</div>
            </div>
            ${u.phone ? `<div><div class="eyebrow">Phone</div><div style="margin-top:3px;font-weight:600">${esc(u.phone)}</div></div>` : ''}
          </div>

          <div class="divider"></div>
          <button class="btn" style="width:100%;color:var(--red);border-color:#ef444422;background:#ef44440a" onclick="handleLogout()">⬡ Logout</button>
        </div>

        <!-- Trip History -->
        <div>
          <div class="section-head" style="margin-bottom:16px">
            <div>
              <div class="eyebrow" style="color:var(--teal)">History</div>
              <h2>Saved Journeys</h2>
            </div>
            ${state.myTrips.length > 0 ? `<span class="badge info">${state.myTrips.length} trips</span>` : ''}
          </div>
          ${state.loadingTrips
            ? `<div class="empty"><div><div class="empty-icon" style="animation:spin 1.2s linear infinite">⟳</div><b>Loading trips…</b></div></div>`
            : state.myTrips.length === 0
            ? `<div class="empty" style="min-height:220px"><div>
                 <div class="empty-icon">▣</div>
                 <b>${t('mytrip.noTrips')}</b>
                 <button class="btn primary" style="margin-top:16px;padding:12px 24px" onclick="go('Plan Trip')">Plan Your First Trip →</button>
               </div></div>`
            : state.myTrips.map(trip => tripCard(trip, riskCls)).join('')
          }
        </div>

      </div>

      ${state.selectedTrip ? tripDetail(state.selectedTrip) : ''}
    </div>
  </section>`;
}

function tripCard(trip, riskCls) {
  const dateStr = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const riskColors = { HIGH: 'var(--red)', MEDIUM: 'var(--orange)', LOW: 'var(--green)', UNKNOWN: 'var(--muted)' };
  const riskColor = riskColors[trip.riskLevel] || 'var(--muted)';

  return `
  <button class="trip" onclick="selectTrip('${esc(trip._id)}')" style="border-left-color:${riskColor}">
    <div class="row">
      <b class="small" style="color:var(--teal)">${esc(trip.tripId || trip._id)}</b>
      <span class="badge ${riskCls[trip.riskLevel] || ''}">${esc(trip.riskLevel)} RISK</span>
    </div>
    <div style="margin-top:8px;font-size:14px;font-weight:600">${esc(trip.origin)} <span style="color:var(--muted)">→</span> ${esc(trip.destination)}</div>
    <div class="row" style="margin-top:8px">
      <div class="muted" style="font-size:11px">${esc(trip.vehicleType)} &nbsp;·&nbsp; ${esc(trip.distance || 'N/A')} &nbsp;·&nbsp; ${esc(trip.estimatedTime || 'N/A')}</div>
      <span class="muted" style="font-size:11px">${dateStr}</span>
    </div>
  </button>`;
}

function tripDetail(trip) {
  const riskColor = trip.riskLevel === 'HIGH' ? 'var(--red)' : trip.riskLevel === 'MEDIUM' ? 'var(--orange)' : 'var(--green)';
  const dateStr = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return `
  <div class="detail" style="margin-top:24px;border-color:#5eead420;border-left:4px solid ${riskColor}">
    <div class="row">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Trip Record</div>
        <h2 style="margin-top:5px">${esc(trip.tripId || trip._id)}</h2>
      </div>
      <button class="link" onclick="state.selectedTrip=null;window.render()">✕ Close</button>
    </div>

    <div class="divider"></div>

    <div class="detail-grid">
      <div><small>Origin</small><strong style="display:block;margin-top:5px">${esc(trip.origin)}</strong></div>
      <div><small>Destination</small><strong style="display:block;margin-top:5px">${esc(trip.destination)}</strong></div>
      <div><small>Vehicle</small><strong style="display:block;margin-top:5px">${esc(trip.vehicleType)}</strong></div>
      <div><small>Distance</small><strong style="display:block;margin-top:5px">${esc(trip.distance || 'N/A')}</strong></div>
      <div><small>Est. Time</small><strong style="display:block;margin-top:5px">${esc(trip.estimatedTime || 'N/A')}</strong></div>
      <div><small>Risk Level</small><strong style="display:block;margin-top:5px;color:${riskColor}">${esc(trip.riskLevel)}</strong></div>
      <div><small>Status</small><strong style="display:block;margin-top:5px">${esc(trip.status)}</strong></div>
      <div><small>Date</small><strong style="display:block;margin-top:5px">${dateStr}</strong></div>
    </div>

    ${trip.riskReason ? `<p class="desc" style="margin-top:16px;padding:12px;background:#5eead408;border-radius:8px;border:1px solid #5eead418">${esc(trip.riskReason)}</p>` : ''}

    <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
      <button class="btn primary" onclick="go('Plan Trip')">Plan Similar Trip →</button>
      <button class="btn danger" onclick="deleteMyTrip('${esc(trip._id)}')">Delete Trip</button>
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
