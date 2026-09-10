// NER SmartLogix — Plan Trip page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { renderRiskPanel, renderRiskPanelLoading, renderRiskPanelError } from '../riskPanel.js';

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
          <select id="vehicle-select" onchange="state.vehicleType=this.value; window._routeRiskCache={}; state.activeRiskSegments=null;">
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
              oninput="state.origin=this.value; window._routeRiskCache={}; state.activeRiskSegments=null;"
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
            oninput="state.destination=this.value; window._routeRiskCache={}; state.activeRiskSegments=null;">
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
  const cachedRisk = window._routeRiskCache && window._routeRiskCache[i];
  return `
  <div class="route">
    <div class="row">
      <div>
        <b>${esc(r.summary)}</b>
        ${i === 0 ? `<span class="badge info" style="margin-left:8px">${t('plan.recommended')}</span>` : ''}
        ${cachedRisk?.overall ? `
          <span class="risk-overall-chip" style="display:inline-flex;margin-left:8px;padding:2px 8px;font-size:10px;background:${cachedRisk.overall.color}20;border:1px solid ${cachedRisk.overall.color}60;color:${cachedRisk.overall.color}">
            ${cachedRisk.overall.level} · ${cachedRisk.overall.score}% Risk
          </span>
        ` : ''}
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

    <!-- Route Risk Intelligence Panel -->
    <div id="risk-panel-container-${i}">
      ${cachedRisk
        ? renderRiskPanel(cachedRisk, i)
        : state.loadingRouteRisk
        ? renderRiskPanelLoading()
        : (r.risk ? `
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
        ` : '')
      }
    </div>

    ${r.warnings && r.warnings.length > 0 ? `<div class="muted" style="margin-top:8px">⚠ ${esc(r.warnings.join(' '))}</div>` : ''}
  </div>`;
}

window.useMyLocation = async () => {
  const { notify } = await import('../render.js');
  if (!navigator.geolocation) {
    state.locationError = t('plan.geoNotSupported') || 'Geolocation is not supported by your browser.';
    window.render();
    return;
  }
  state.locationError = null;
  const input = document.getElementById('origin-input');
  if (input) input.placeholder = t('plan.detectingLocation') || 'Detecting your location…';

  notify(t('plan.detectingLocation') || 'Detecting your location…', 'success');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      state.userLocation = { lat, lng };
      try {
        const { reverseGeocodeOSM } = await import('../maps.js');
        const addr = await reverseGeocodeOSM(lat, lng);
        state.origin = addr;
        state._detectedAddress = addr;
        state.locationError = null;
      } catch (e) {
        state.origin = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        state._detectedAddress = state.origin;
      }
      window.render();
    },
    (err) => {
      const msgs = {
        1: 'Location permission was denied. Please allow location access in your browser address bar to auto-detect your location, or type it manually.',
        2: 'Current GPS location is unavailable from your device. Please enter your origin manually.',
        3: 'Location request timed out. Please try again or enter your origin manually.'
      };
      state.locationError = msgs[err.code] || 'Could not detect your current location. Please enter it manually.';
      notify(state.locationError, 'error');
      window.render();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
};

async function fetchRiskAnalysisForAllRoutes() {
  if (!state.routes || state.routes.length === 0) {
    state.loadingRouteRisk = false;
    return;
  }

  const promises = state.routes.map(async (r, i) => {
    try {
      const riskData = await api.analyzeRouteRisk({
        route: r,
        origin: state.origin,
        destination: state.destination,
        vehicleType: state.vehicleType
      });
      if (!window._routeRiskCache) window._routeRiskCache = {};
      window._routeRiskCache[i] = riskData;

      const container = document.getElementById(`risk-panel-container-${i}`);
      if (container) {
        container.innerHTML = renderRiskPanel(riskData, i);
      }
    } catch (err) {
      console.warn(`[ML Risk] Route ${i} analysis failed:`, err.message);
      const container = document.getElementById(`risk-panel-container-${i}`);
      if (container) {
        container.innerHTML = renderRiskPanelError('Route risk analysis temporarily unavailable.');
      }
    }
  });

  await Promise.allSettled(promises);
  state.loadingRouteRisk = false;
  if (window.render && state.page === 'Plan Trip') {
    window.render();
  }
}

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
  window._routeRiskCache = {};
  state.activeRiskSegments = null;
  state.loadingRouteRisk = false;
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
    state.loadingRouteRisk = true;
    window.render();

    fetchRiskAnalysisForAllRoutes();
  } catch (err) {
    state.loadingRoutes = false;
    state.loadingRouteRisk = false;
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
  state._originalMainRoute = route;

  // Pass analyzed risk segments to state for map visualization
  if (window._routeRiskCache && window._routeRiskCache[index]?.segments) {
    state.activeRiskSegments = window._routeRiskCache[index].segments;
  } else {
    state.activeRiskSegments = null;
  }

  notify(`Route selected: ${route.summary}`, 'success');
  const { go } = await import('../router.js');
  go('Live Network');
};

// Automatically attach OpenStreetMap / Photon Autocomplete on render
export async function initPlanPage() {
  setTimeout(async () => {
    try {
      const { attachOSMAutocomplete } = await import('../maps.js');
      attachOSMAutocomplete('origin-input', (label, lat, lng) => {
        state.origin = label;
        state.userLocation = { lat, lng };
        window._routeRiskCache = {};
        state.activeRiskSegments = null;
      });
      attachOSMAutocomplete('dest-input', (label) => {
        state.destination = label;
        window._routeRiskCache = {};
        state.activeRiskSegments = null;
      });
    } catch (e) {
      console.warn('[Plan] Autocomplete init:', e.message);
    }
  }, 100);
}
