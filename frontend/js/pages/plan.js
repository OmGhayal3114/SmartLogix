// NER SmartLogix — Plan Trip page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

const VEHICLES = ['Truck', 'Heavy Truck', 'Mini Truck', 'Cargo Van', 'Pickup', 'Refrigerated Truck', 'Tanker'];

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function renderPlanPage() {
  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Logistics Navigation</div>
        <h2>${t('plan.title')}</h2>
        <p class="desc">${t('plan.subtitle')}</p>
      </div>
    </div>

    <div class="plan-grid">

      <div class="card form-card">

        <div class="field">
          <label>${t('plan.vehicle')}</label>
          <select id="vehicle-select" onchange="state.vehicleType=this.value">
            ${VEHICLES.map(v => `<option ${v === state.vehicleType ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>${t('plan.origin')}</label>
          <input type="text" id="origin-input" value="${esc(state.origin)}"
            placeholder="${t('plan.enterOrigin')}"
            oninput="state.origin=this.value">
        </div>

        <div class="field">
          <label>${t('plan.destination')}</label>
          <input type="text" id="dest-input" value="${esc(state.destination)}"
            placeholder="${t('plan.enterDest')}"
            oninput="state.destination=this.value">
        </div>

        <button class="btn primary" style="width:100%" onclick="calculateRoutes()" ${state.loadingRoutes ? 'disabled' : ''}>
          ${state.loadingRoutes ? `⟳ ${t('plan.calculating')}` : t('plan.calculate')}
        </button>

      </div>

      <div>
        ${state.loadingRoutes
          ? `<div class="empty"><div><div style="font-size:38px;color:var(--teal)">⟳</div><b>${t('plan.calculating')}</b></div></div>`
          : !state.routeReady
          ? `<div class="empty"><div>
              <div style="font-size:38px;color:var(--teal)">⇄</div>
              <b>Build your route</b>
              <p class="muted">Select a logistics vehicle, enter origin and destination, then press Calculate Routes.</p>
             </div></div>`
          : state.routes.length === 0
          ? `<div class="empty"><div><b>${t('plan.noRoutes')}</b></div></div>`
          : state.routes.map((r, i) => routeCard(r, i)).join('')
        }
      </div>

    </div>
  </section>`;
}

function routeCard(r, i) {
  return `
  <div class="route">
    <div class="row">
      <div>
        <b>${esc(r.summary)}</b>
        ${i === 0 ? `<span class="badge info" style="margin-left:8px">${t('plan.recommended')}</span>` : ''}
        <div class="muted" style="margin-top:8px">${esc(r.startAddress || '')} → ${esc(r.endAddress || '')}</div>
      </div>
      <button class="btn ${i === 0 ? 'primary' : ''}" onclick="selectRoute(${i})">
        ${t('plan.selectRoute')}
      </button>
    </div>
    <div class="route-grid">
      <div><small>${t('plan.distance')}</small><strong>${esc(r.distance)}</strong></div>
      <div><small>${t('plan.duration')}</small><strong>${esc(r.duration)}</strong></div>
      ${r.durationInTraffic ? `<div><small>${t('plan.traffic')}</small><strong>${esc(r.durationInTraffic)}</strong></div>` : ''}
      <div><small>Vehicle</small><strong>${esc(r.vehicleType)}</strong></div>
    </div>
    ${r.warnings && r.warnings.length > 0 ? `<div class="muted" style="margin-top:8px">⚠ ${esc(r.warnings.join(' '))}</div>` : ''}
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
  notify(`Route selected: ${route.summary}`, 'success');
  const { go } = await import('../router.js');
  go('Live Network');
};
