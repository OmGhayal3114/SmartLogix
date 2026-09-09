// NER SmartLogix — Plan Trip page (Redesigned)

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

const VEHICLES = [
  { value: 'Truck', icon: '🚛' },
  { value: 'Heavy Truck', icon: '🚚' },
  { value: 'Mini Truck', icon: '🚐' },
  { value: 'Cargo Van', icon: '📦' },
  { value: 'Pickup', icon: '🛻' },
  { value: 'Refrigerated Truck', icon: '❄️' },
  { value: 'Tanker', icon: '⛽' }
];

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function renderPlanPage() {
  return `
  <section class="content">

    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-eyebrow">Logistics Navigation</div>
      <h1 class="hero-title">${t('plan.title')}</h1>
      <p class="hero-sub">${t('plan.subtitle')}</p>
      <div class="hero-actions">
        <span class="badge info">◉ OSRM Routing</span>
        <span class="badge success">⚡ Risk Scoring Active</span>
        <span class="badge">${VEHICLES.length} Vehicle Types</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">⇄</div>
        <div class="stat-value">${state.routes.length || '—'}</div>
        <div class="stat-label">Routes Found</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">!</div>
        <div class="stat-value" data-count="${state.top10Alerts.length}">${state.top10Alerts.length}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green)">
        <div class="stat-icon">✓</div>
        <div class="stat-value">${state.selectedRoute ? '1' : '—'}</div>
        <div class="stat-label">Route Selected</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="content-body">
      <div class="plan-grid">

        <!-- Form Card -->
        <div class="card form-card">
          <div style="margin-bottom:4px">
            <div class="eyebrow" style="color:var(--teal)">Configure Trip</div>
          </div>

          <div class="field">
            <label>${t('plan.vehicle')}</label>
            <select id="vehicle-select" onchange="state.vehicleType=this.value">
              ${VEHICLES.map(v => `<option value="${v.value}" ${v.value === state.vehicleType ? 'selected' : ''}>${v.icon} ${v.value}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label>${t('plan.origin')}</label>
            <input type="text" id="origin-input" value="${esc(state.origin)}"
              placeholder="${t('plan.enterOrigin')}"
              oninput="state.origin=this.value">
          </div>

          <!-- Swap Button -->
          <div style="display:flex;justify-content:center">
            <button class="btn" style="padding:6px 14px;font-size:18px;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:-6px 0" onclick="swapOriginDest()" title="Swap origin & destination">⇅</button>
          </div>

          <div class="field">
            <label>${t('plan.destination')}</label>
            <input type="text" id="dest-input" value="${esc(state.destination)}"
              placeholder="${t('plan.enterDest')}"
              oninput="state.destination=this.value">
          </div>

          <button class="btn primary" style="width:100%;padding:14px;font-size:14px;font-weight:700;letter-spacing:0.3px" onclick="calculateRoutes()" ${state.loadingRoutes ? 'disabled' : ''}>
            ${state.loadingRoutes
              ? `<span style="display:flex;align-items:center;justify-content:center;gap:8px"><span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> ${t('plan.calculating')}</span>`
              : `⇄ &nbsp;${t('plan.calculate')}`
            }
          </button>

          ${state.selectedRoute ? `
          <div class="info-banner info" style="margin-top:0;margin-bottom:0">
            <span>◉</span>
            <div>
              <b style="color:var(--teal)">Route active:</b>
              <div style="font-size:11px;margin-top:2px;color:var(--muted)">${esc(state.selectedRoute.summary)}</div>
            </div>
          </div>` : ''}
        </div>

        <!-- Routes Panel -->
        <div>
          ${state.loadingRoutes
            ? `<div class="empty"><div>
                <div class="empty-icon" style="animation:spin 1.2s linear infinite">⟳</div>
                <b>${t('plan.calculating')}</b>
                <p class="muted">Finding optimal routes across the NER region…</p>
              </div></div>`
            : !state.routeReady
            ? `<div class="empty"><div>
                <div class="empty-icon">⇄</div>
                <b>Build your route</b>
                <p class="muted" style="margin-top:8px">Select a vehicle, enter origin and destination, then press Calculate Routes.</p>
                <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                  <span class="badge info">🏔 Mountain terrain</span>
                  <span class="badge warning">🌧 Monsoon aware</span>
                  <span class="badge success">⚡ Real-time risk</span>
                </div>
               </div></div>`
            : state.routes.length === 0
            ? `<div class="empty"><div><b>${t('plan.noRoutes')}</b><p class="muted" style="margin-top:8px">Try different locations or check spelling.</p></div></div>`
            : `<div class="eyebrow" style="color:var(--muted);margin-bottom:16px">${state.routes.length} route${state.routes.length !== 1 ? 's' : ''} found</div>${state.routes.map((r, i) => routeCard(r, i)).join('')}`
          }
        </div>

      </div>
    </div>
  </section>`;
}

function routeCard(r, i) {
  const riskColor = r.risk ? (r.risk.risk === 'HIGH' ? 'var(--red)' : r.risk.risk === 'MEDIUM' ? 'var(--orange)' : 'var(--green)') : 'var(--muted)';
  const riskScore = r.risk ? Number(r.risk.score || 0).toFixed(0) : null;
  const hazards = r.risk?.metrics?.matchedHazards || 0;

  return `
  <div class="route">
    <div class="row" style="align-items:flex-start;gap:16px">
      <div style="flex:1">
        <div class="route-title">${esc(r.summary)}</div>
        ${i === 0 ? `<div style="margin-top:5px"><span class="badge info">★ ${t('plan.recommended')}</span></div>` : ''}
        <div class="muted" style="margin-top:6px;font-size:12px">
          ${esc(r.startAddress || '')} <span style="color:#1e3a5f">—</span> ${esc(r.endAddress || '')}
        </div>
      </div>
      <button class="btn ${i === 0 ? 'primary' : ''}" style="flex-shrink:0" onclick="selectRoute(${i})">
        ${t('plan.selectRoute')} →
      </button>
    </div>

    <div class="route-grid">
      <div class="route-pill">
        <span style="color:var(--teal)">📍</span>
        <span>
          <div class="pill-label">Distance</div>
          <div class="pill-value">${esc(r.distance)}</div>
        </span>
      </div>
      <div class="route-pill">
        <span style="color:var(--blue)">⏱</span>
        <span>
          <div class="pill-label">Duration</div>
          <div class="pill-value">${esc(r.duration)}</div>
        </span>
      </div>
      ${r.durationInTraffic ? `
      <div class="route-pill">
        <span style="color:var(--orange)">🚦</span>
        <span>
          <div class="pill-label">With Traffic</div>
          <div class="pill-value">${esc(r.durationInTraffic)}</div>
        </span>
      </div>` : ''}
      <div class="route-pill">
        <span>🚛</span>
        <span>
          <div class="pill-label">Vehicle</div>
          <div class="pill-value">${esc(state.vehicleType)}</div>
        </span>
      </div>
      ${riskScore ? `
      <div class="route-pill" style="border-color:${riskColor}30">
        <span style="color:${riskColor}">⚠</span>
        <span>
          <div class="pill-label">Risk Score</div>
          <div class="pill-value" style="color:${riskColor}">${riskScore}/100</div>
        </span>
      </div>
      <div class="route-pill">
        <span>◈</span>
        <span>
          <div class="pill-label">Hazards</div>
          <div class="pill-value">${hazards}</div>
        </span>
      </div>` : ''}
    </div>

    ${r.risk ? `
    <div class="risk-bar-track" style="margin-top:14px">
      <div class="risk-bar-fill" data-risk-score="${Number(r.risk.score || 0).toFixed(1)}" style="width:0%"></div>
    </div>
    ${r.risk.recommendation ? `<div class="muted" style="margin-top:8px;font-size:11px;line-height:1.5">💡 ${esc(r.risk.recommendation)}</div>` : ''}
    ` : ''}

    ${r.warnings?.length ? `<div class="muted" style="margin-top:8px;font-size:11px">⚠ ${esc(r.warnings.join(' '))}</div>` : ''}
  </div>`;
}

window.calculateRoutes = async () => {
  const { notify } = await import('../render.js');
  if (!state.origin.trim() || !state.destination.trim()) {
    notify('Please enter both origin and destination.', 'error');
    return;
  }
  if (state.origin.trim().toLowerCase() === state.destination.trim().toLowerCase()) {
    notify('Origin and destination cannot be the same.', 'error');
    return;
  }

  state.loadingRoutes = true;
  state.routeReady = false;
  state.routes = [];
  window.render();

  try {
    const data = await api.calculateRoutes({
      origin: state.origin,
      destination: state.destination,
      vehicleType: state.vehicleType
    });
    state.routes = data.routes || [];
    state.routeReady = true;
    state.loadingRoutes = false;
    window.render();
  } catch (err) {
    state.loadingRoutes = false;
    state.routeReady = true;
    notify(err.message || t('plan.routeError'), 'error');
    window.render();
  }
};

window.selectRoute = async (index) => {
  const { notify } = await import('../render.js');
  const route = state.routes[index];
  if (!route) return;
  state.selectedRoute = route;
  state.selectedFacility = null;
  notify(`Route selected: ${route.summary}`, 'success');
  const { go } = await import('../router.js');
  go('Live Network');
};

window.swapOriginDest = () => {
  const tmp = state.origin;
  state.origin = state.destination;
  state.destination = tmp;
  window.render();
};
