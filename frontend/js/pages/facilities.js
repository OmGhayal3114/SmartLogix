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
  const noRoute = !state.origin || !state.destination || !state.selectedRoute;

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Route-based facilities</div>
        <h2>${t('facilities.title')}</h2>
        <p class="desc">${t('facilities.subtitle')}</p>
      </div>
    </div>

    ${noRoute
      ? `<div class="empty">
           <div>
             <div style="font-size:38px;color:var(--teal)">◇</div>
             <b>${t('facilities.noRoute')}</b>
             <button class="btn primary" style="margin-top:15px" onclick="go('Plan Trip')">Plan a Trip</button>
           </div>
         </div>`
      : state.loadingFacilities
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">⟳</div><b>${t('facilities.loading')}</b></div></div>`
      : state.facilities.length === 0
      ? `<div class="empty"><div><b>${t('facilities.noResults')}</b></div></div>`
      : `
        <div style="margin-bottom:16px;color:var(--muted);font-size:13px">
          Facilities along route: <b style="color:var(--text)">${esc(state.origin)} → ${esc(state.destination)}</b>
        </div>

        <div class="facilities">
          ${state.facilities.map(f => `
          <div class="facility" style="cursor:pointer" onclick="selectFacility(${state.facilities.indexOf(f)})" title="Show directions on map">
            <div class="row">
              <div>
                <b>${esc(f.name)}</b>
                <div class="muted" style="margin-top:4px;font-size:11px">${esc(f.address || '')}</div>
              </div>
              <span class="badge" style="color:${typeColor[f.facilityType] || 'var(--teal)'}">
                ${typeLabel[f.facilityType] || f.facilityType}
              </span>
            </div>
            <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
              ${f.rating ? `<span class="muted">⭐ ${f.rating}</span>` : ''}
              ${f.openNow != null
                ? `<span class="badge ${f.openNow ? 'success' : 'warning'}">${f.openNow ? t('facilities.open') : t('facilities.closed')}</span>`
                : ''}
            </div>
          </div>`).join('')}
        </div>`
    }
  </section>`;
}

window.selectFacility = async (index) => {
  const facility = state.facilities[index];
  if (!facility || !facility.coordinates) return;
  state.selectedFacility = facility;
  const { go } = await import('../router.js');
  go('Live Network');
};
