// NER SmartLogix — Live Network page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { initMap, displayRoute, startUserLocationTracking } from '../maps.js';


function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', MEDIUM: '#f59e0b', HIGH: '#f97316', 'VERY HIGH': '#ef4444' };
const RISK_BG = { LOW: '#10b98115', MODERATE: '#f59e0b15', MEDIUM: '#f59e0b15', HIGH: '#f9731615', 'VERY HIGH': '#ef444415' };

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
      <div style="position:absolute;left:14px;bottom:14px;z-index:500;background:#07111fee;border:1px solid #2dd4bf44;border-radius:8px;padding:10px 14px;color:#cbd5e1;font-size:11px;max-width:320px;box-shadow:0 6px 20px rgba(0,0,0,0.5)">
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

        ${state.routes && state.routes.length > 1 ? `
          <div style="margin-top:14px;padding:12px;border-radius:8px;background:#0c1524;border:1px solid #1e293b">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-size:11px;font-weight:600;color:var(--teal)">AVAILABLE CORRIDORS</span>
              <span class="muted" style="font-size:10px">${state.routes.length} options</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${state.routes.map((rt, idx) => {
                const isActive = rt === r || (rt.summary === r.summary && rt.distance === r.distance);
                const rtRisk = rt.risk?.score ? `${rt.risk.score}% ${rt.risk.risk}` : '';
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;background:${isActive ? '#10b98118' : '#07101e'};border:1px solid ${isActive ? '#10b98155' : '#1e293b'}">
                    <div style="font-size:11px">
                      <b style="color:${isActive ? '#5eead4' : '#e2e8f0'}">${esc(rt.summary)}</b>
                      <div class="muted" style="font-size:10px">${esc(rt.distance)} · ${esc(rt.duration)}${rtRisk ? ` · <span style="color:${rt.risk?.risk === 'HIGH' ? '#f87171' : '#34d399'}">${esc(rtRisk)}</span>` : ''}</div>
                    </div>
                    ${isActive
                      ? `<span class="badge success" style="font-size:10px">Active</span>`
                      : `<button class="btn" style="padding:3px 8px;font-size:10px" onclick="switchLiveRoute(${idx})">Switch</button>`
                    }
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Unified ML Route Risk Intelligence Panel -->
        <div style="margin-top:20px;padding:16px;border-radius:10px;background:#090e17;border:1px solid #1e293b">
          ${state.loadingRisk
            ? `<div style="color:var(--muted)">${t('live.loadingRisk')}</div>`
            : risk
            ? `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="color:#5eead4;font-size:14px">⚡</span>
                  <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;color:#cbd5e1">ROUTE RISK INTELLIGENCE</span>
                  <span class="risk-badge-proto">PROTOTYPE — ESTIMATED RISK</span>
                </div>
                <div class="risk-overall-chip" style="background:${riskColor}20;border:1px solid ${riskColor}60;color:${riskColor}">
                  <span class="risk-chip-dot" style="background:${riskColor}"></span>
                  <span>${esc(risk.risk || 'MODERATE')}</span>
                  <span style="font-weight:700;margin-left:4px">${Math.round(risk.score || 0)}%</span>
                </div>
              </div>

              ${risk.factors ? `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
                  <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:8px">
                    <div style="display:flex;justify-content:space-between;font-size:11px">
                      <span>🌧️ Rain</span>
                      <b style="color:${risk.factors.rain.level === 'HIGH' || risk.factors.rain.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}">${risk.factors.rain.score}%</b>
                    </div>
                    <div class="risk-bar-track" style="margin:4px 0"><div class="risk-bar-fill" style="width:${risk.factors.rain.score}%;background:${risk.factors.rain.level === 'HIGH' || risk.factors.rain.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}"></div></div>
                    <div style="font-size:9px;color:#94a3b8">${esc(risk.factors.rain.level)}</div>
                  </div>
                  <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:8px">
                    <div style="display:flex;justify-content:space-between;font-size:11px">
                      <span>🏔️ Landslide</span>
                      <b style="color:${risk.factors.landslide.level === 'HIGH' || risk.factors.landslide.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}">${risk.factors.landslide.score}%</b>
                    </div>
                    <div class="risk-bar-track" style="margin:4px 0"><div class="risk-bar-fill" style="width:${risk.factors.landslide.score}%;background:${risk.factors.landslide.level === 'HIGH' || risk.factors.landslide.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}"></div></div>
                    <div style="font-size:9px;color:#94a3b8">${esc(risk.factors.landslide.level)}</div>
                  </div>
                  <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:8px">
                    <div style="display:flex;justify-content:space-between;font-size:11px">
                      <span>🌊 Flood</span>
                      <b style="color:${risk.factors.flood.level === 'HIGH' || risk.factors.flood.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}">${risk.factors.flood.score}%</b>
                    </div>
                    <div class="risk-bar-track" style="margin:4px 0"><div class="risk-bar-fill" style="width:${risk.factors.flood.score}%;background:${risk.factors.flood.level === 'HIGH' || risk.factors.flood.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}"></div></div>
                    <div style="font-size:9px;color:#94a3b8">${esc(risk.factors.flood.level)}</div>
                  </div>
                  <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:8px">
                    <div style="display:flex;justify-content:space-between;font-size:11px">
                      <span>🚗 Traffic</span>
                      <b style="color:${risk.factors.traffic.level === 'HIGH' || risk.factors.traffic.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}">${risk.factors.traffic.score}%</b>
                    </div>
                    <div class="risk-bar-track" style="margin:4px 0"><div class="risk-bar-fill" style="width:${risk.factors.traffic.score}%;background:${risk.factors.traffic.level === 'HIGH' || risk.factors.traffic.level === 'VERY HIGH' ? 'var(--orange)' : 'var(--green)'}"></div></div>
                    <div style="font-size:9px;color:#94a3b8">${esc(risk.factors.traffic.level)}</div>
                  </div>
                </div>
              ` : ''}

              <div style="background:#0c1424;border:1px solid #1e293b;border-radius:6px;padding:8px 10px;font-size:11px;color:#cbd5e1;line-height:1.4">
                <b>Safety Advisory:</b> ${esc(risk.recommendation || 'Drive with standard highway precautions.')}
              </div>

              ${risk.keyFactors && risk.keyFactors.length ? `
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
                  ${risk.keyFactors.map(kf => `<span class="risk-factor-tag">${esc(kf)}</span>`).join('')}
                </div>
              ` : ''}

              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:10px;color:#64748b">
                <span>Open-Meteo Weather · IMD Climatology · GSI Zonation</span>
                ${risk.confidencePct ? `<span>Confidence: <b style="color:var(--teal)">${risk.confidencePct}%</b></span>` : ''}
              </div>
            `
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

  state.loadingMap = false;
  state.loadingRisk = false;

  if (state.selectedRoute.risk && !state.mlRisk) {
    state.mlRisk = state.selectedRoute.risk;
  }

  // Background risk loading if not already cached
  if (!state.selectedRoute.risk && !state.mlRisk) {
    api.getRouteRisk({
      origin: state.origin,
      destination: state.destination,
      vehicleType: state.vehicleType
    }).then(riskData => {
      state.mlRisk = riskData;
    }).catch(() => {});
  }

  // Ensure DOM container is mounted and ready
  const mapElement = document.getElementById('osm-map');
  if (!mapElement) return;

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

window.switchLiveRoute = async (idx) => {
  const { notify } = await import('../render.js');
  const route = state.routes && state.routes[idx];
  if (!route) return;

  state.selectedRoute = route;
  state.selectedFacility = null;
  state._originalMainRoute = route;

  if (window._routeRiskCache && window._routeRiskCache[idx]?.segments) {
    state.activeRiskSegments = window._routeRiskCache[idx].segments;
  } else if (route.risk?.segments) {
    state.activeRiskSegments = route.risk.segments;
  }

  notify(`Switched to: ${route.summary}`, 'success');
  const { displayRoute } = await import('../maps.js');
  displayRoute(route);
  await window.render();
};

