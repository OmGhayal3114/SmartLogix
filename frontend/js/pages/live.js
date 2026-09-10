// NER SmartLogix — Live Network page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { initMap, displayRoute, startUserLocationTracking } from '../maps.js';


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
  const risk = r.risk || state.mlRisk;
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

    <!-- OpenStreetMap Leaflet interactive container -->
    <div id="osm-map" style="height:480px;border-radius:12px;border:1px solid #2dd4bf26;background:#040a12;position:relative;margin-bottom:24px;box-shadow:0 8px 30px rgba(0,0,0,0.6);z-index:0">
      ${state.loadingMap
        ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#040a12;z-index:10">
             <div style="text-align:center;color:var(--teal)">
               <div style="font-size:32px;margin-bottom:10px">◎</div>
               ${t('live.loadingMap') || 'Loading OpenStreetMap navigation…'}
             </div>
           </div>`
        : ''}
      <div style="position:absolute;left:14px;bottom:14px;z-index:5;background:#07111fee;border:1px solid #2dd4bf44;border-radius:8px;padding:10px 14px;color:#cbd5e1;font-size:11px;max-width:320px;box-shadow:0 6px 20px rgba(0,0,0,0.5)">
        <div id="location-status" style="font-weight:500">Live GPS ready</div>
        <div style="margin-top:6px;display:flex;justify-content:space-between;gap:12px">
          <span>Remaining: <b id="remaining-distance" style="color:#ffffff">${state.remainingDistance || '—'}</b></span>
          <span style="color:var(--teal)">ETA: <b id="remaining-eta" style="color:#5eead4">${state.remainingDuration || '—'}</b></span>
        </div>
        <div id="facility-direction-info" style="margin-top:8px"></div>
        <div id="facility-directions-list" style="margin-top:6px;max-height:140px;overflow-y:auto;color:#e2e8f0"></div>
      </div>
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
               <div style="font-size:22px;font-weight:bold;color:${riskColor};margin:8px 0">${Number(risk.score || 0).toFixed(1)}/100 ROUTE RISK</div>
               <p style="font-size:12px;color:#94a3b8;line-height:1.6">
                 ${esc(risk.recommendation || risk.reason || 'Route risk assessment available.')}
               </p>
               ${Array.isArray(risk.reasons) && risk.reasons.length
                 ? `<div style="margin-top:8px">${risk.reasons.slice(0, 3).map(reason => `<div style="font-size:11px;color:#cbd5e1;margin-top:4px">• ${esc(reason)}</div>`).join('')}</div>`
                 : ''}
               <div style="font-size:10px;color:var(--muted);margin-top:8px">
                 ${risk.scoringVersion ? `◉ ${esc(risk.scoringVersion)}` : risk.source === 'ml-model' ? '◉ ML model prediction' : '⚡ Rule-based assessment'}
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

      <!-- Route Alerts removed as requested -->
    </div>


  </section>`;
}



export async function initLiveNetwork() {
  if (!state.selectedRoute) return;

  // Fetch ML risk BEFORE any render so we don't re-render after the map is alive
  try {
    const riskData = await api.getRouteRisk({
      origin: state.origin,
      destination: state.destination,
      vehicleType: state.vehicleType
    });
    if (!state.selectedRoute.risk) {
      state.mlRisk = riskData;
    }
  } catch (_) {}

  // Single render pass — risk data is already in state
  state.loadingMap = false;
  state.loadingRisk = false;
  window.render();

  // Initialize map AFTER the DOM is painted — never re-render after this point
  setTimeout(async () => {
    const oMap = await initMap('osm-map');
    if (oMap) {
      oMap.invalidateSize(true);
      displayRoute(state.selectedRoute);
      startUserLocationTracking();
      if (state.selectedFacility) {
        const { displayFacilityRoute } = await import('../maps.js');
        displayFacilityRoute(state.selectedFacility);
      }
    }
  }, 150);
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
