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
          : `
            ${renderSafetyAlternateBanner()}
            ${applyRouteComparisons(state.routes).map((r, i) => routeCard(r, i)).join('')}
          `
        }
      </div>

    </div>
  </section>`;
}

function renderSafetyAlternateBanner() {
  const routes = state.routes || [];
  if (routes.length < 2) return '';

  const primary = routes[0];
  const primaryRisk = primary?.risk?.score ?? (window._routeRiskCache?.[0]?.overall?.score ?? 0);
  const isHighRisk = (primary?.risk?.risk === 'HIGH' || primary?.risk?.risk === 'VERY HIGH' || primaryRisk >= 50);

  const saferRoute = routes.find((r, idx) => idx > 0 && (r.isAlternateSafetyRoute || r.isRecommendedForSafety));
  if (!isHighRisk && !saferRoute) return '';

  const altRisk = saferRoute?.risk?.score ?? (window._routeRiskCache?.[1]?.overall?.score ?? 0);
  const reduction = saferRoute?.riskReductionPct || (primaryRisk > altRisk ? Math.round(((primaryRisk - altRisk) / primaryRisk) * 100) : 0);

  return `
    <div class="safety-alert-banner" style="margin-bottom:16px;padding:14px 16px;border-radius:10px;background:linear-gradient(135deg, #ef444418 0%, #0f172a 100%);border:1px solid #ef444455;box-shadow:0 4px 20px rgba(0,0,0,0.3)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:24px;line-height:1">⚠️</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <strong style="color:#f87171;font-size:13px;letter-spacing:0.5px">HIGH RISK DETECTED ON DIRECT ROUTE</strong>
            <span class="badge" style="background:#ef444430;color:#fca5a5;border:1px solid #ef444460;font-size:10px">
              Direct Highway: ${primaryRisk}% Risk
            </span>
            ${saferRoute ? `
              <span class="badge" style="background:#10b98130;color:#6ee7b7;border:1px solid #10b98160;font-size:10px;font-weight:700">
                🛡️ Alternate Detour Suggested: ${altRisk}% Risk (${reduction}% Safer)
              </span>
            ` : ''}
          </div>
          <p style="margin:6px 0 0;font-size:12px;color:#cbd5e1;line-height:1.45">
            Elevated weather, landslide, or flood hazards detected along the direct corridor. SmartLogix has automatically evaluated shortest distance, fastest duration, and corridor risk rates. Review the compared options below and choose your preferred route.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Multi-criteria comparative model:
 * Compares shortest distance, less time (duration), and low risk rate.
 */
export function applyRouteComparisons(routes) {
  if (!routes || routes.length === 0) return routes;

  const minDistance = Math.min(...routes.map(r => r.distanceValue || Infinity));
  const minDuration = Math.min(...routes.map(r => r.durationValue || Infinity));
  const minRisk = Math.min(...routes.map((r, i) => {
    const cached = window._routeRiskCache?.[i];
    return (cached?.overall?.score ?? r.risk?.score ?? 50);
  }));

  routes.forEach((r, i) => {
    const dist = r.distanceValue || 0;
    const dur = r.durationValue || 0;
    const cached = window._routeRiskCache?.[i];
    const risk = cached?.overall?.score ?? (r.risk?.score ?? 50);

    r.isShortest = dist <= minDistance * 1.03;
    r.isFastest = dur <= minDuration * 1.03;
    r.isLowestRisk = risk <= minRisk + 2;
  });

  let bestRoute = null;
  let bestPenalty = Infinity;

  routes.forEach((r, idx) => {
    const distRatio = minDistance > 0 ? (r.distanceValue / minDistance) : 1;
    const durRatio = minDuration > 0 ? (r.durationValue / minDuration) : 1;
    const cached = window._routeRiskCache?.[idx];
    const riskVal = cached?.overall?.score ?? (r.risk?.score ?? 50);
    const riskLevel = cached?.overall?.level ?? (r.risk?.risk ?? 'MODERATE');

    // Multi-criteria weights: Safety/Risk (45%), Travel Time (35%), Distance (20%)
    let penalty = (0.45 * (riskVal / 100)) +
                  (0.35 * (durRatio - 1)) +
                  (0.20 * (distRatio - 1));

    const isHighHazard = Boolean(cached?.factors && (
      cached.factors.landslide?.level === 'HIGH' || cached.factors.landslide?.level === 'VERY HIGH' ||
      cached.factors.flood?.level === 'HIGH' || cached.factors.flood?.level === 'VERY HIGH' ||
      cached.factors.rain?.level === 'HIGH' || cached.factors.rain?.level === 'VERY HIGH'
    )) || Boolean(r.risk?.factors && (
      r.risk.factors.landslide?.level === 'HIGH' || r.risk.factors.landslide?.level === 'VERY HIGH' ||
      r.risk.factors.flood?.level === 'HIGH' || r.risk.factors.flood?.level === 'VERY HIGH' ||
      r.risk.factors.rain?.level === 'HIGH' || r.risk.factors.rain?.level === 'VERY HIGH'
    ));

    if (riskLevel === 'VERY HIGH' || riskVal >= 75) {
      penalty += 0.80;
    } else if (riskLevel === 'HIGH' || riskVal >= 50 || isHighHazard) {
      penalty += 0.40;
    } else if (riskLevel === 'LOW' || riskVal <= 25) {
      penalty -= 0.15;
    }

    if (idx === 0 && riskVal < 45 && !isHighHazard) {
      penalty -= 0.12;
    }

    r.compositeScore = penalty;
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestRoute = r;
    }
  });

  routes.forEach((r, idx) => {
    const isRec = (r === bestRoute);
    r.isRecommended = isRec;
    const cached = window._routeRiskCache?.[idx];
    const riskVal = cached?.overall?.score ?? (r.risk?.score ?? 0);
    const isDirect = r.isDirectRoute || idx === 0;

    if (isRec) {
      if (r.isShortest && r.isFastest && r.isLowestRisk) {
        r.title = 'Recommended Route — Shortest, Fastest & Lowest Risk';
        r.recommendationReason = `Optimal choice: Shortest distance (${r.distance}), fastest travel time (${r.duration}), and lowest hazard risk (${riskVal}%).`;
      } else if (r.isShortest && r.isFastest) {
        r.title = 'Recommended Route — Fastest & Shortest Corridor';
        r.recommendationReason = `Best trade-off: Fastest time (${r.duration}) and direct distance (${r.distance}) with manageable risk (${riskVal}%).`;
      } else if (r.isLowestRisk) {
        r.title = 'Recommended Route — Safest Alternate Corridor';
        r.recommendationReason = `Selected for safety: Lowest hazard risk (${riskVal}%), avoiding severe weather/landslide hazards on direct highway.`;
      } else {
        r.title = 'Recommended Route — Best Overall Balance';
        r.recommendationReason = `Balanced trade-off across travel time (${r.duration}), distance (${r.distance}), and corridor risk (${riskVal}%).`;
      }
    } else {
      if (isDirect && (riskVal >= 50 || cached?.overall?.level === 'HIGH' || r.risk?.risk === 'HIGH')) {
        r.title = 'Direct Highway Route (High Risk Corridor)';
        r.recommendationReason = `Shortest (${r.distance}) and fastest (${r.duration}), but caution is advised due to elevated hazard score (${riskVal}%).`;
      } else if (r.isShortest && r.isFastest) {
        r.title = 'Direct Highway Route (Shortest & Fastest)';
        r.recommendationReason = `Shortest distance (${r.distance}) and fastest time (${r.duration}).`;
      } else if (r.isLowestRisk) {
        r.title = 'Alternate Safety Bypass (Lowest Risk)';
        r.recommendationReason = `Lowest corridor risk (${riskVal}%), but requires longer distance (${r.distance}).`;
      } else {
        r.title = r.summary || `Alternative Route ${idx + 1}`;
        r.recommendationReason = `Alternative road option (${r.distance}, ${r.duration}).`;
      }
    }
  });

  return routes;
}

function routeCard(r, i) {
  const cachedRisk = (window._routeRiskCache && window._routeRiskCache[i]) || (r.risk?.overall ? {
    success: true,
    overall: r.risk.overall,
    factors: r.risk.factors,
    segments: r.risk.segments,
    metadata: r.risk.metadata || {},
    recommendation: r.risk.recommendation,
    keyFactors: r.risk.keyFactors,
    confidencePct: r.risk.confidencePct
  } : null);

  const riskScore = cachedRisk?.overall?.score ?? (r.risk?.score ?? 0);
  const isHighRisk = cachedRisk?.overall?.level === 'HIGH' || cachedRisk?.overall?.level === 'VERY HIGH' || riskScore >= 50;
  const isRecommended = Boolean(r.isRecommended);
  const isDirect = i === 0 || r.isDirectRoute;

  let riskPanelHtml = '';
  try {
    if (cachedRisk) {
      riskPanelHtml = renderRiskPanel(cachedRisk, i);
    } else if (state.loadingRouteRisk) {
      riskPanelHtml = renderRiskPanelLoading();
    } else if (r.risk) {
      riskPanelHtml = `
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
      `;
    }
  } catch (err) {
    console.warn('[Plan] Error rendering risk panel for route', i, err);
    riskPanelHtml = renderRiskPanelError('Route risk analysis temporarily unavailable.');
  }

  return `
  <div class="route" style="${isRecommended ? 'border:1.5px solid #10b98180;background:linear-gradient(135deg, #10b98110 0%, #0f172a 100%);box-shadow:0 4px 20px rgba(16,185,129,0.18)' : (isDirect && isHighRisk ? 'border:1px solid #ef444455;background:#ef444408' : '')}">
    <div class="row">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <b style="font-size:15px;color:${isRecommended ? '#5eead4' : '#f8fafc'}">${esc(r.title || r.summary)}</b>

          ${isRecommended ? `
            <span class="badge success" style="background:#10b98130;color:#6ee7b7;border:1px solid #10b98180;font-weight:700;padding:3px 8px;font-size:11px">
              🌟 RECOMMENDED
            </span>
          ` : ''}

          ${r.isShortest ? `
            <span class="badge" style="background:#0284c725;color:#38bdf8;border:1px solid #0284c760;font-size:10px;font-weight:600">
              📏 Shortest Distance
            </span>
          ` : ''}

          ${r.isFastest ? `
            <span class="badge" style="background:#8b5cf625;color:#c084fc;border:1px solid #8b5cf660;font-size:10px;font-weight:600">
              ⚡ Fastest Time
            </span>
          ` : ''}

          ${r.isLowestRisk ? `
            <span class="badge" style="background:#10b98125;color:#34d399;border:1px solid #10b98160;font-size:10px;font-weight:600">
              🛡️ Lowest Risk (${riskScore}%)
            </span>
          ` : ''}

          ${(!isRecommended && isDirect && isHighRisk) ? `
            <span class="badge warning" style="background:#f9731625;color:#fb923c;border:1px solid #f9731660;font-size:10px">
              DIRECT HIGHWAY (HIGH RISK)
            </span>
          ` : ''}

          ${cachedRisk?.overall ? `
            <span class="risk-overall-chip" style="display:inline-flex;padding:2px 8px;font-size:10px;background:${cachedRisk.overall.color || '#14b8a6'}20;border:1px solid ${cachedRisk.overall.color || '#14b8a6'}60;color:${cachedRisk.overall.color || '#14b8a6'}">
              ${cachedRisk.overall.level} · ${cachedRisk.overall.score}% Risk
            </span>
          ` : ''}
        </div>

        ${r.recommendationReason ? `
          <div style="margin-top:6px;font-size:12px;color:${isRecommended ? '#a7f3d0' : '#94a3b8'};display:flex;align-items:center;gap:6px;line-height:1.4">
            <span>${isRecommended ? '✨' : 'ℹ️'}</span>
            <span>${esc(r.recommendationReason)}</span>
          </div>
        ` : ''}

        <div class="muted" style="margin-top:6px">${esc(r.startAddress || '')} → ${esc(r.endAddress || '')}</div>
      </div>

      <button class="btn ${isRecommended ? 'primary' : ''}"
        style="${isRecommended ? 'background:#10b981;border-color:#10b981;color:#040a12;font-weight:700;box-shadow:0 0 14px rgba(16,185,129,0.35)' : ''}"
        onclick="selectRoute(${i})">
        ${isRecommended ? 'Select Recommended Route' : t('plan.selectRoute')}
      </button>
    </div>

    <div class="route-grid" style="margin-top:14px">
      <div>
        <small>${t('plan.distance')}</small>
        <strong style="${r.isShortest ? 'color:#38bdf8' : ''}">${esc(r.distance)} ${r.isShortest ? '★' : ''}</strong>
      </div>
      <div>
        <small>${t('plan.duration')}</small>
        <strong style="${r.isFastest ? 'color:#c084fc' : ''}">${esc(r.duration)} ${r.isFastest ? '★' : ''}</strong>
      </div>
      <div>
        <small>Risk Rate</small>
        <strong style="color:${riskScore >= 50 ? 'var(--red,#ef4444)' : riskScore >= 26 ? 'var(--orange,#f97316)' : 'var(--green,#10b981)'}">
          ${riskScore}% ${r.isLowestRisk ? '★' : ''}
        </strong>
      </div>
      <div><small>Vehicle</small><strong>${esc(r.vehicleType)}</strong></div>
    </div>

    <!-- Route Risk Intelligence Panel -->
    <div id="risk-panel-container-${i}">
      ${riskPanelHtml}
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

  const originEl = document.getElementById('origin-input');
  const destEl = document.getElementById('dest-input');
  const vehicleEl = document.getElementById('vehicle-select');
  if (originEl && originEl.value) state.origin = originEl.value;
  if (destEl && destEl.value) state.destination = destEl.value;
  if (vehicleEl && vehicleEl.value) state.vehicleType = vehicleEl.value;

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
    state.hasHighRiskAlert = data.hasHighRiskAlert || false;
    state.alternateRouteSuggested = data.alternateRouteSuggested || false;

    // Immediately seed the risk cache from the server ML enrichment
    if (!window._routeRiskCache) window._routeRiskCache = {};
    state.routes.forEach((r, idx) => {
      if (r.risk && r.risk.overall) {
        window._routeRiskCache[idx] = {
          success: true,
          overall: r.risk.overall,
          factors: r.risk.factors,
          segments: r.risk.segments,
          metadata: r.risk.metadata || {},
          recommendation: r.risk.recommendation,
          keyFactors: r.risk.keyFactors,
          confidencePct: r.risk.confidencePct
        };
      }
    });

    state.routeReady = true;
    state.loadingRoutes = false;
    state.loadingRouteRisk = false;
    window.render();

    // Check if any route needs background risk analysis
    const hasUnanalyzed = state.routes.some((_, i) => !window._routeRiskCache[i]);
    if (hasUnanalyzed) {
      fetchRiskAnalysisForAllRoutes();
    }
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
