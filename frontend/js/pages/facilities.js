// NER SmartLogix — Facilities page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export async function loadFacilitiesPage() {
  if (!state.origin || !state.destination || !state.selectedRoute) return;
  if (state.facilities.length > 0) return; // Already loaded from Live Network
  state.loadingFacilities = true;
  window.render();
  try {
    const data = await api.getFacilitiesNearRoute(state.origin, state.destination);
    state.facilities = data.facilities || [];
  } catch (err) {
    const { notify } = await import('../render.js');
    notify(err.message || 'Failed to load facilities.', 'error');
  }
  state.loadingFacilities = false;
  window.render();
}

export function renderFacilitiesPage() {
  const typeLabel = {
    hospital: t('facilities.hospital'),
    lodging: t('facilities.hotel'),
    gas_station: t('facilities.petrolPump')
  };
  const typeColor = { hospital: 'var(--red)', lodging: 'var(--orange)', gas_station: 'var(--teal)' };
  const typeEmoji = { hospital: '🏥', lodging: '🏨', gas_station: '⛽' };
  const noRoute = !state.origin || !state.destination || !state.selectedRoute;

  const hospitalsCount = state.facilities.filter(f => f.facilityType === 'hospital').length;
  const fuelCount = state.facilities.filter(f => f.facilityType === 'gas_station').length;
  const hotelCount = state.facilities.filter(f => f.facilityType === 'lodging').length;

  return `
  <section class="content">
    <div class="hero">
      <div class="hero-eyebrow">Logistics Facilities</div>
      <h1 class="hero-title">${t('facilities.title')}</h1>
      <p class="hero-sub">${t('facilities.subtitle')}</p>
      <div class="hero-actions">
        <span class="badge info">⛽ Fuel Stations</span>
        <span class="badge danger">🏥 Hospitals</span>
        <span class="badge warning">🏨 Lodging</span>
        ${!noRoute ? `<span class="badge success">Corridor: ${esc(state.origin)} → ${esc(state.destination)}</span>` : ''}
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">⛽</div>
        <div class="stat-value" data-count="${fuelCount}">${fuelCount}</div>
        <div class="stat-label">Fuel Stations</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--red)">
        <div class="stat-icon">🏥</div>
        <div class="stat-value" data-count="${hospitalsCount}">${hospitalsCount}</div>
        <div class="stat-label">Hospitals</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">🏨</div>
        <div class="stat-value" data-count="${hotelCount}">${hotelCount}</div>
        <div class="stat-label">Lodgings</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--blue)">
        <div class="stat-icon">◇</div>
        <div class="stat-value" data-count="${state.facilities.length}">${state.facilities.length}</div>
        <div class="stat-label">Total Along Route</div>
      </div>
    </div>

    <div class="content-body">
      ${noRoute
        ? `<div class="empty">
             <div>
               <div class="empty-icon">◇</div>
               <b>${t('facilities.noRoute')}</b>
               <p class="muted" style="margin-top:8px">Select a journey corridor in Plan Trip to discover verified logistics facilities along the highway.</p>
               <button class="btn primary" style="margin-top:18px;padding:12px 24px" onclick="go('Plan Trip')">Plan a Trip →</button>
             </div>
           </div>`
        : state.loadingFacilities
        ? `<div class="empty"><div><div class="empty-icon" style="animation:spin 1.2s linear infinite">⟳</div><b>${t('facilities.loading')}</b></div></div>`
        : state.facilities.length === 0
        ? `<div class="empty"><div><b>${t('facilities.noResults')}</b><p class="muted" style="margin-top:8px">No verified amenities found within corridor radius.</p></div></div>`
        : `
          <div class="section-head">
            <div>
              <div class="eyebrow" style="color:var(--teal)">Highway Amenities</div>
              <h2>${esc(state.origin)} <span style="color:var(--muted)">→</span> ${esc(state.destination)}</h2>
            </div>
            <span class="badge info">${state.facilities.length} facilities found</span>
          </div>

          <div class="facilities">
            ${state.facilities.map((f, i) => `
            <div class="facility" style="cursor:pointer" onclick="selectFacility(${i})" title="Show directions on map">
              <div class="facility-type-bar" style="background:${typeColor[f.facilityType] || 'var(--teal)'}"></div>
              <div class="row" style="align-items:flex-start">
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:700">${esc(f.name)}</div>
                  <div class="muted" style="margin-top:4px;font-size:11px">${esc(f.address || 'Address on route')}</div>
                </div>
                <span class="badge" style="color:${typeColor[f.facilityType] || 'var(--teal)'};background:${typeColor[f.facilityType] || 'var(--teal)'}15">
                  ${typeEmoji[f.facilityType] || ''} ${typeLabel[f.facilityType] || f.facilityType}
                </span>
              </div>
              <div style="display:flex;gap:8px;margin-top:14px;align-items:center;flex-wrap:wrap">
                ${f.rating ? `<span class="badge" style="background:#ffffff06">⭐ ${f.rating}</span>` : ''}
                ${f.openNow != null
                  ? `<span class="badge ${f.openNow ? 'success' : 'warning'}">${f.openNow ? '● ' + t('facilities.open') : '○ ' + t('facilities.closed')}</span>`
                  : ''}
                <span class="muted" style="margin-left:auto;font-size:11px">Tap for map →</span>
              </div>
            </div>`).join('')}
          </div>`
      }
    </div>
  </section>`;
}

window.selectFacility = async (index) => {
  const facility = state.facilities[index];
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};
