// NER SmartLogix — Live Network page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { loadGoogleMapsScript, initMap, displayRoute, addFacilityMarkers, addAlertMarkers } from '../maps.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

const RISK_COLORS = { LOW: 'var(--green)', MEDIUM: 'var(--orange)', HIGH: 'var(--red)' };
const RISK_BG = { LOW: '#34d39912', MEDIUM: '#fb923c12', HIGH: '#ef444412' };

export function renderLivePage() {
  if (!state.selectedRoute) {
    return `
    <section class="content">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--teal)">Regional command view</div>
          <h2>${t('live.title')}</h2>
        </div>
      </div>
      <div class="empty">
        <div>
          <div style="font-size:38px;color:var(--teal)">◎</div>
          <b>${t('live.noRoute')}</b>
          <p class="muted">Plan a trip and select a route to see live intelligence.</p>
          <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">${t('live.goToPlan')}</button>
        </div>
      </div>
    </section>`;
  }

  const r = state.selectedRoute;
  const risk = state.mlRisk;
  const riskColor = risk ? (RISK_COLORS[risk.risk] || 'var(--teal)') : '#64748b';
  const riskBg = risk ? (RISK_BG[risk.risk] || '#ffffff08') : '#ffffff08';

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Regional command view</div>
        <h2>${t('live.title')}</h2>
      </div>
      <span class="badge success">Network operational</span>
    </div>

    <!-- Google Map container -->
    <div id="google-map" style="height:460px;border-radius:12px;border:1px solid #2dd4bf26;background:#040a12;position:relative;overflow:hidden;margin-bottom:24px">
      ${state.loadingMap
        ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#040a12">
             <div style="text-align:center;color:var(--teal)">
               <div style="font-size:32px;margin-bottom:10px">◎</div>
               ${t('live.loadingMap')}
             </div>
           </div>`
        : ''}
    </div>

    <div class="grid two">

      <!-- Route Info + Risk -->
      <div class="card">
        <div class="eyebrow" style="color:var(--teal);margin-bottom:12px">${t('live.routeInfo')}</div>
        <div class="detail-grid" style="grid-template-columns:1fr 1fr">
          <div><small>${t('live.origin')}</small><strong style="display:block;margin-top:5px">${esc(state.origin)}</strong></div>
          <div><small>${t('live.destination')}</small><strong style="display:block;margin-top:5px">${esc(state.destination)}</strong></div>
          <div><small>${t('live.vehicle')}</small><strong style="display:block;margin-top:5px">${esc(state.vehicleType)}</strong></div>
          <div><small>${t('live.distance')}</small><strong style="display:block;margin-top:5px">${esc(r.distance)}</strong></div>
          <div><small>${t('live.eta')}</small><strong style="display:block;margin-top:5px">${esc(r.duration)}</strong></div>
          ${r.durationInTraffic ? `<div><small>${t('live.trafficEta')}</small><strong style="display:block;margin-top:5px">${esc(r.durationInTraffic)}</strong></div>` : ''}
        </div>

        <!-- Risk Panel -->
        <div style="margin-top:20px;padding:16px;border-radius:10px;background:${riskBg};border:1px solid ${riskColor}44">
          ${state.loadingRisk
            ? `<div style="color:var(--muted)">${t('live.loadingRisk')}</div>`
            : risk
            ? `<div class="eyebrow">${t('live.routeRisk')}</div>
               <div style="font-size:22px;font-weight:bold;color:${riskColor};margin:8px 0">${risk.risk} RISK</div>
               <p style="font-size:12px;color:#94a3b8;line-height:1.6">${esc(risk.reason)}</p>
               <div style="font-size:10px;color:var(--muted);margin-top:8px">
                 ${risk.source === 'ml-model' ? '◉ ML model prediction' : '⚡ Rule-based assessment'}
                 ${risk.note ? ' (ML service offline)' : ''}
               </div>`
            : `<div style="color:var(--muted)">Risk assessment unavailable.</div>`
          }
        </div>

        ${state.user
          ? `<button class="btn primary" style="width:100%;margin-top:16px" onclick="saveTripToServer()">
               ${t('live.saveTrip')}
             </button>`
          : `<button class="btn" style="width:100%;margin-top:16px" onclick="openAuth('login')">
               Login to save this trip
             </button>`
        }
      </div>

      <!-- Route Alerts -->
      <div class="card">
        <div class="eyebrow" style="color:var(--orange);margin-bottom:12px">${t('live.relevantAlerts')}</div>
        ${state.loadingAlerts
          ? `<div style="color:var(--muted)">${t('live.loadingAlerts')}</div>`
          : state.routeAlerts.length === 0
          ? `<div style="color:var(--muted);font-size:13px">No active alerts detected for this route corridor.</div>`
          : state.routeAlerts.map(a => alertCard(a)).join('')
        }
      </div>

    </div>

    <!-- Facilities -->
    <div class="card" style="margin-top:24px">
      <div class="eyebrow" style="color:var(--teal);margin-bottom:12px">${t('live.nearbyFacilities')}</div>
      ${state.loadingFacilities
        ? `<div style="color:var(--muted)">${t('live.loadingFacilities')}</div>`
        : state.facilities.length === 0
        ? `<div style="color:var(--muted);font-size:13px">No facility data available. Ensure Google Places API is enabled.</div>`
        : `<div class="facilities">${state.facilities.slice(0, 9).map(f => facilityCard(f)).join('')}</div>`
      }
    </div>

  </section>`;
}

function alertCard(a) {
  const tone = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'warning', LOW: '' };
  return `
  <div class="alert">
    <div class="row">
      <span class="badge ${tone[a.severity] || ''}">${a.severity}</span>
      <span class="muted">${esc(a.state)}</span>
    </div>
    <div class="small" style="margin-top:8px">${esc(a.title)}</div>
    <div class="muted" style="margin-top:4px">${esc(a.location)}</div>
  </div>`;
}

function facilityCard(f) {
  const typeLabel = { hospital: 'Hospital', lodging: 'Hotel', gas_station: 'Fuel Station' };
  const typeColor = { hospital: 'var(--red)', lodging: 'var(--orange)', gas_station: 'var(--teal)' };
  return `
  <div class="facility" style="cursor:default">
    <div class="row">
      <div>
        <b style="font-size:13px">${esc(f.name)}</b>
        <div class="muted" style="margin-top:4px;font-size:11px">${esc(f.address || '')}</div>
      </div>
      <span class="badge" style="color:${typeColor[f.facilityType] || 'var(--teal)'}">${typeLabel[f.facilityType] || f.facilityType}</span>
    </div>
    <div style="margin-top:8px">
      ${f.rating ? `<span class="muted">⭐ ${f.rating}</span>` : ''}
      ${f.openNow != null ? `<span class="badge ${f.openNow ? 'success' : 'warning'}" style="margin-left:8px">${f.openNow ? 'Open' : 'Closed'}</span>` : ''}
    </div>
  </div>`;
}

export async function initLiveNetwork() {
  if (!state.selectedRoute) return;

  state.loadingMap = true;
  state.loadingRisk = true;
  state.loadingAlerts = true;
  state.loadingFacilities = true;
  window.render();

  // Load Google Maps
  try {
    await loadGoogleMapsScript();
    state.loadingMap = false;
    window.render();
    // Small delay so the DOM updates before initMap
    setTimeout(() => {
      const map = initMap('google-map');
      if (map) displayRoute(state.origin, state.destination);
    }, 150);
  } catch (err) {
    state.loadingMap = false;
    console.error('[Maps]', err.message);
    window.render();
  }

  // Parallel data fetches
  const [riskRes, alertsRes, facilitiesRes] = await Promise.allSettled([
    api.getRouteRisk({ origin: state.origin, destination: state.destination, vehicleType: state.vehicleType }),
    api.getRouteAlerts(state.origin, state.destination),
    api.getFacilitiesNearRoute(state.origin, state.destination)
  ]);

  if (riskRes.status === 'fulfilled') state.mlRisk = riskRes.value;
  state.loadingRisk = false;

  if (alertsRes.status === 'fulfilled') {
    state.routeAlerts = alertsRes.value.alerts || [];
    setTimeout(() => addAlertMarkers(state.routeAlerts), 600);
  }
  state.loadingAlerts = false;

  if (facilitiesRes.status === 'fulfilled') {
    state.facilities = facilitiesRes.value.facilities || [];
    setTimeout(() => addFacilityMarkers(state.facilities), 600);
  }
  state.loadingFacilities = false;

  window.render();
}

window.saveTripToServer = async () => {
  const { notify } = await import('../render.js');
  if (!state.user || !state.token) { window.openAuth('login'); return; }
  if (!state.selectedRoute) return;

  try {
    const r = state.selectedRoute;
    await api.createTrip({
      origin: state.origin,
      destination: state.destination,
      vehicleType: state.vehicleType,
      route: { summary: r.summary, steps: (r.steps || []).slice(0, 5), polyline: r.polyline || '' },
      distance: r.distance,
      estimatedTime: r.duration,
      riskLevel: state.mlRisk ? state.mlRisk.risk : 'UNKNOWN',
      riskReason: state.mlRisk ? state.mlRisk.reason : ''
    }, state.token);
    notify(t('live.tripSaved'), 'success');
  } catch (err) {
    notify(err.message || 'Failed to save trip.', 'error');
  }
};
