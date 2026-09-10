// NER SmartLogix — Plan Trip page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

const VEHICLES = [
  'Mini Truck',
  'Pickup Truck',
  'Light Commercial Vehicle',
  'Medium Truck',
  'Heavy Truck',
  'Container Truck',
  'Refrigerated Truck',
  'Tanker Truck',
  'Multi-Axle Truck'
];

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
            <option value="" ${!state.vehicleType ? 'selected' : ''} disabled>${t('plan.selectVehicle')}</option>
            ${VEHICLES.map(v => `<option value="${v}" ${v === state.vehicleType ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          ${state.vehicleType ? `<div style="margin-top:4px;font-size:11px;color:var(--teal)">✓ ${esc(state.vehicleType)}</div>` : ''}
        </div>

        <div class="field">
          <label>${t('plan.origin')}</label>
          <div style="display:flex;gap:8px;align-items:stretch">
            <input type="text" id="origin-input" value="${esc(state.origin)}"
              placeholder="${t('plan.enterOrigin')}"
              oninput="state.origin=this.value"
              style="flex:1">
            <button class="btn" title="${t('plan.yourLocation')}"
              style="padding:8px 10px;white-space:nowrap;flex-shrink:0"
              onclick="useMyLocation()">
              📍 ${t('plan.yourLocation')}
            </button>
          </div>
          ${state.locationError ? `<div style="color:var(--red);font-size:11px;margin-top:4px">⚠ ${esc(state.locationError)}</div>` : ''}
          ${state.userLocation && state.origin && state.origin === state._detectedAddress
            ? `<div style="color:var(--teal);font-size:11px;margin-top:4px">✓ ${t('plan.locationDetected')}</div>`
            : ''}
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
              <p class="muted">Select a vehicle, enter origin and destination, then press Calculate Routes.</p>
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

    ${r.risk ? `
      <div style="margin-top:12px;padding:12px;border-radius:9px;background:#ffffff06;border:1px solid #ffffff12">
        <div class="row">
          <div>
            <small>Route risk</small>
            <strong style="display:block;margin-top:4px;color:${r.risk.risk === 'HIGH' ? 'var(--red)' : r.risk.risk === 'MEDIUM' ? 'var(--orange)' : 'var(--green)'}">
              ${esc(r.risk.risk)} · ${Number(r.risk.score || 0).toFixed(1)}/100
            </strong>
          </div>
          <span class="badge">${Number(r.risk.metrics?.matchedHazards || 0)} hazards</span>
        </div>
        ${r.risk.recommendation ? `<div class="muted" style="margin-top:7px;font-size:11px">${esc(r.risk.recommendation)}</div>` : ''}
      </div>
    ` : ''}

    ${r.warnings && r.warnings.length > 0 ? `<div class="muted" style="margin-top:8px">⚠ ${esc(r.warnings.join(' '))}</div>` : ''}
  </div>`;
}

window.useMyLocation = async () => {
  const { notify } = await import('../render.js');
  if (!navigator.geolocation) {
    state.locationError = t('plan.geoNotSupported');
    window.render();
    return;
  }
  state.locationError = null;
  // Show a detecting message in origin field
  const input = document.getElementById('origin-input');
  if (input) input.placeholder = t('plan.detectingLocation');

  notify(t('plan.detectingLocation'), 'success');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { lat, lng } = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.userLocation = { lat, lng };
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const addr = data.display_name
          ? data.display_name.split(',').slice(0, 3).join(', ')
          : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        state.origin = addr;
        state._detectedAddress = addr;
        state.locationError = null;
      } catch (e) {
        // fallback to coordinates if reverse geocode fails
        state.origin = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        state._detectedAddress = state.origin;
      }
      window.render();
    },
    (err) => {
      const msgs = {
        1: t('plan.locationDenied'),
        2: t('plan.locationUnavailable'),
        3: t('plan.locationTimeout')
      };
      state.locationError = msgs[err.code] || t('plan.locationError');
      window.render();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
};

window.calculateRoutes = async () => {
  const { notify } = await import('../render.js');
  if (!state.vehicleType) {
    notify(t('plan.selectVehicleFirst'), 'error');
    return;
  }
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
