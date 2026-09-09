// NER SmartLogix — Live Network page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { initMap, displayRoute, displayFacilityRoute, startUserLocationTracking, addFacilityMarkers, addAlertMarkers } from '../maps.js';

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
      <div class="hero">
        <div class="hero-eyebrow">Regional Command View</div>
        <h1 class="hero-title">${t('live.title')}</h1>
        <p class="hero-sub">Live telemetry, road hazard overlays, turn-by-turn routing, and logistics facilities.</p>
        <div class="hero-actions">
          <span class="badge success">● Network Operational</span>
          <span class="badge info">OSRM & OpenStreetMap</span>
        </div>
      </div>
      <div class="content-body">
        <div class="empty">
          <div>
            <div class="empty-icon">◎</div>
            <b>${t('live.noRoute')}</b>
            <p class="muted" style="margin-top:8px">Plan a journey and select a route to see live map tracking and hazard analysis.</p>
            <button class="btn primary" style="margin-top:18px;padding:12px 24px" onclick="go('Plan Trip')">${t('live.goToPlan')} →</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  const r = state.selectedRoute;
  const risk = r.risk || state.mlRisk;
  const riskColor = risk ? (RISK_COLORS[risk.risk] || 'var(--teal)') : '#64748b';
  const riskBg = risk ? (RISK_BG[risk.risk] || '#ffffff08') : '#ffffff08';
  const riskScore = risk ? Number(risk.score || 0).toFixed(0) : '—';

  return `
  <section class="content">
    <div class="hero">
      <div class="hero-eyebrow">Regional Command View</div>
      <h1 class="hero-title">${esc(state.origin)} <span style="font-weight:400;color:var(--muted)">→</span> ${esc(state.destination)}</h1>
      <p class="hero-sub">Active route monitoring via ${esc(r.summary)} for ${esc(state.vehicleType)}.</p>
      <div class="hero-actions">
        <span class="badge success">● GPS Telemetry Ready</span>
        <span class="badge info">OSRM Active</span>
        <span class="badge ${risk?.risk === 'HIGH' ? 'danger' : risk?.risk === 'MEDIUM' ? 'warning' : 'success'}">Risk: ${risk?.risk || 'Calculating'}</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">📍</div>
        <div class="stat-value">${esc(r.distance)}</div>
        <div class="stat-label">Total Distance</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--blue)">
        <div class="stat-icon">⏱</div>
        <div class="stat-value">${esc(r.duration)}</div>
        <div class="stat-label">Estimated Time</div>
      </div>
      <div class="stat-card" style="--stat-color:${riskColor}">
        <div class="stat-icon">⚠</div>
        <div class="stat-value">${riskScore}/100</div>
        <div class="stat-label">Hazard Risk</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">!</div>
        <div class="stat-value" data-count="${state.routeAlerts.length}">${state.routeAlerts.length}</div>
        <div class="stat-label">Corridor Alerts</div>
      </div>
    </div>

    <div class="content-body">
      <!-- OpenStreetMap / Leaflet map container -->
      <div id="osm-map" style="height:480px;border-radius:14px;border:1px solid #5eead425;background:#040a12;position:relative;overflow:hidden;margin-bottom:24px;box-shadow:0 8px 32px #00000060">
        ${state.loadingMap
          ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#040a12">
               <div style="text-align:center;color:var(--teal)">
                 <div class="empty-icon" style="animation:spin 1s linear infinite">◎</div>
                 ${t('live.loadingMap')}
               </div>
             </div>`
          : ''}
        <div style="position:absolute;left:14px;bottom:14px;z-index:500;background:#07111fe8;border:1px solid #2dd4bf44;border-radius:10px;padding:10px 14px;color:#cbd5e1;font-size:11px;max-width:280px;box-shadow:0 4px 20px #00000060;backdrop-filter:blur(8px)">
          <div id="location-status" style="display:flex;align-items:center;gap:6px"><span style="width:6px;height:6px;border-radius:50%;background:var(--teal);display:inline-block"></span> Live location is ready.</div>
          <div style="margin-top:6px">Remaining distance: <b id="remaining-distance" style="color:#fff">—</b></div>
          ${state.selectedFacility ? `<div id="facility-direction-info" style="margin-top:6px;color:#fb923c">Directions to ${esc(state.selectedFacility.name)}…</div>` : ''}
          ${state.selectedFacility ? `<div id="facility-directions-list" style="margin-top:8px;max-height:130px;overflow:auto;color:#e2e8f0">Loading turn-by-turn directions…</div>` : ''}
        </div>
      </div>

      <div class="grid two">

        <!-- Route Info + Risk -->
        <div class="card">
          <div class="eyebrow" style="color:var(--teal);margin-bottom:14px">${t('live.routeInfo')}</div>
          <div class="detail-grid" style="grid-template-columns:1fr 1fr">
            <div><small>${t('live.origin')}</small><strong style="display:block;margin-top:5px">${esc(state.origin)}</strong></div>
            <div><small>${t('live.destination')}</small><strong style="display:block;margin-top:5px">${esc(state.destination)}</strong></div>
            <div><small>${t('live.vehicle')}</small><strong style="display:block;margin-top:5px">${esc(state.vehicleType)}</strong></div>
            <div><small>${t('live.distance')}</small><strong style="display:block;margin-top:5px">${esc(r.distance)}</strong></div>
            <div><small>${t('live.eta')}</small><strong style="display:block;margin-top:5px">${esc(r.duration)}</strong></div>
            ${r.durationInTraffic ? `<div><small>${t('live.trafficEta')}</small><strong style="display:block;margin-top:5px">${esc(r.durationInTraffic)}</strong></div>` : ''}
          </div>

          <!-- Risk Panel -->
          <div style="margin-top:20px;padding:18px;border-radius:12px;background:${riskBg};border:1px solid ${riskColor}40">
            ${state.loadingRisk
              ? `<div style="color:var(--muted)">${t('live.loadingRisk')}</div>`
              : risk
              ? `<div class="eyebrow">${t('live.routeRisk')}</div>
                 <div style="font-size:24px;font-weight:800;color:${riskColor};margin:8px 0">${Number(risk.score || 0).toFixed(1)}/100 ROUTE RISK</div>
                 <div class="risk-bar-track">
                   <div class="risk-bar-fill" data-risk-score="${Number(risk.score || 0).toFixed(1)}" style="width:0%"></div>
                 </div>
                 <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin-top:10px">
                   ${esc(risk.recommendation || risk.reason || 'Route risk assessment available.')}
                 </p>
                 ${Array.isArray(risk.reasons) && risk.reasons.length
                   ? `<div style="margin-top:8px">${risk.reasons.slice(0, 3).map(reason => `<div style="font-size:11px;color:#cbd5e1;margin-top:4px">• ${esc(reason)}</div>`).join('')}</div>`
                   : ''}
                 <div style="font-size:10px;color:var(--muted);margin-top:10px">
                   ${risk.scoringVersion ? `◉ ${esc(risk.scoringVersion)}` : risk.source === 'ml-model' ? '◉ ML model prediction' : '⚡ Rule-based assessment'}
                   ${risk.note ? ' (ML service offline)' : ''}
                 </div>`
              : `<div style="color:var(--muted)">Risk assessment unavailable.</div>`
            }
          </div>

          ${state.user
            ? `<button class="btn primary" style="width:100%;margin-top:18px;padding:12px" onclick="saveTripToServer()">
                 ${t('live.saveTrip')} →
               </button>`
            : `<button class="btn" style="width:100%;margin-top:18px;padding:12px" onclick="openAuth('login')">
                 Login to save this trip
               </button>`
          }
        </div>

        <!-- Route Alerts -->
        <div class="card">
          <div class="eyebrow" style="color:var(--orange);margin-bottom:14px">${t('live.relevantAlerts')}</div>
          ${state.loadingAlerts
            ? `<div style="color:var(--muted)">${t('live.loadingAlerts')}</div>`
            : state.routeAlerts.length === 0
            ? `<div class="info-banner success"><b>Safer to travel</b><br><span style="font-size:11px">No active verified alerts detected for this route corridor.</span></div>`
            : state.routeAlerts.map(a => alertCard(a)).join('')
          }
        </div>

      </div>

      <!-- Facilities -->
      <div class="card" style="margin-top:24px">
        <div class="eyebrow" style="color:var(--teal);margin-bottom:14px">${t('live.nearbyFacilities')}</div>
        ${state.loadingFacilities
          ? `<div style="color:var(--muted)">${t('live.loadingFacilities')}</div>`
          : state.facilities.length === 0
          ? `<div style="color:var(--muted);font-size:13px">No facility data available for this route.</div>`
          : `<div class="facilities">${state.facilities.slice(0, 9).map(f => facilityCard(f)).join('')}</div>`
        }
      </div>

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
  <div class="facility" style="cursor:pointer" onclick="selectFacilityFromLive('${esc(f.placeId)}')" title="Show directions on map">
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

window.selectFacilityFromLive = async (placeId) => {
  const facility = state.facilities.find(item => String(item.placeId) === String(placeId));
  if (!facility) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};

export async function initLiveNetwork() {
  if (!state.selectedRoute) return;

  state.loadingMap = true;
  state.loadingRisk = true;
  state.loadingAlerts = true;
  state.loadingFacilities = true;
  window.render();

  // Initialize the OpenStreetMap/Leaflet renderer
  try {
    state.loadingMap = false;
    window.render();
    // Small delay so the DOM updates before initializing Leaflet.
    setTimeout(async () => {
      const map = await initMap('osm-map');
      if (map) {
        displayRoute(state.selectedRoute);
        startUserLocationTracking();
        if (state.selectedFacility) displayFacilityRoute(state.selectedFacility);
      }
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

  if (riskRes.status === 'fulfilled' && !state.selectedRoute.risk) {
    state.mlRisk = riskRes.value;
  }
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
  // Rendering the updated cards replaces the map DOM node. Recreate Leaflet
  // after that render so the map remains visible after data loads.
  setTimeout(async () => {
    const liveMap = await initMap('osm-map');
    if (liveMap) {
      displayRoute(state.selectedRoute);
      startUserLocationTracking();
      if (state.selectedFacility) displayFacilityRoute(state.selectedFacility);
      addAlertMarkers(state.routeAlerts);
      addFacilityMarkers(state.facilities);
    }
  }, 50);
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
