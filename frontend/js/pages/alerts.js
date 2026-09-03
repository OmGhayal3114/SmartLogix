// NER SmartLogix — Alerts page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export async function loadTop10Alerts() {
  state.loadingAlerts = true;
  window.render();
  try {
    const data = await api.getTop10Alerts();
    state.top10Alerts = data.alerts || [];
    state.alertsLastUpdated = data.lastUpdated;
  } catch (err) {
    const { notify } = await import('../render.js');
    notify(err.message || 'Failed to load alerts.', 'error');
    state.top10Alerts = [];
  }
  state.loadingAlerts = false;
  window.render();
}

export function renderAlertsPage() {
  const tone = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'warning', LOW: '' };
  const updatedStr = state.alertsLastUpdated
    ? new Date(state.alertsLastUpdated).toLocaleString('en-IN')
    : null;
  const hasSampleData = state.top10Alerts.some(a => a.source && a.source.includes('Sample Data'));

  return `
  <section class="content">
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--orange)">Safety intelligence</div>
        <h2>${t('alerts.title')}</h2>
        <p class="desc">${t('alerts.subtitle')}</p>
      </div>
      ${updatedStr ? `<span class="badge">Updated: ${updatedStr}</span>` : ''}
    </div>

    ${hasSampleData ? `
    <div style="padding:12px 14px;background:#fb923c0d;border:1px solid #fb923c33;border-radius:8px;margin-bottom:18px;font-size:12px;color:#fdba74;line-height:1.6">
      ⚡ ${t('alerts.sampleNote')}
    </div>` : ''}

    ${state.loadingAlerts
      ? `<div class="empty"><div><div style="font-size:32px;color:var(--teal)">⟳</div><b>${t('alerts.loading')}</b></div></div>`
      : state.top10Alerts.length === 0
      ? `<div class="empty"><div><b>${t('alerts.noAlerts')}</b></div></div>`
      : state.top10Alerts.map((a, i) => alertItem(a, i, tone)).join('')
    }

    ${state.selectedAlert ? alertDetail(state.selectedAlert, tone) : ''}

  </section>`;
}

function alertItem(a, i, tone) {
  const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
  return `
  <button class="alert" onclick="selectAlert(${i})">
    <div class="row">
      <div style="flex:1">
        <b>${esc(a.title)}</b>
        <span class="badge ${tone[a.severity] || ''}" style="margin-left:8px">${a.severity}</span>
      </div>
      <span class="muted" style="white-space:nowrap;font-size:11px">${dateStr}</span>
    </div>
    <div class="row" style="margin-top:8px">
      <span class="muted">${esc(a.state)} · ${esc(a.location)}</span>
      <span class="badge" style="background:#ffffff08">${esc(a.alertType)}</span>
    </div>
  </button>`;
}

function alertDetail(a, tone) {
  const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
  return `
  <div class="detail" style="border-color:#fb923c33;margin-top:24px">
    <div class="row">
      <div>
        <span class="badge ${tone[a.severity] || ''}">${a.severity}</span>
        <h2 style="margin-top:10px">${esc(a.title)}</h2>
      </div>
      <button class="link" onclick="state.selectedAlert=null;window.render()">✕ Close</button>
    </div>

    <div class="detail-grid" style="margin-top:16px">
      <div><small>${t('alerts.state')}</small><strong style="display:block;margin-top:5px">${esc(a.state)}</strong></div>
      <div><small>${t('alerts.location')}</small><strong style="display:block;margin-top:5px">${esc(a.location)}</strong></div>
      <div><small>Type</small><strong style="display:block;margin-top:5px">${esc(a.alertType)}</strong></div>
      <div><small>Date/Time</small><strong style="display:block;margin-top:5px">${dateStr}</strong></div>
    </div>

    ${a.description ? `<p class="desc" style="margin-top:14px">${esc(a.description)}</p>` : ''}
    ${a.source ? `<div class="muted" style="margin-top:12px;font-size:11px">Source: ${esc(a.source)}</div>` : ''}

    <div style="margin-top:16px">
      <button class="btn primary" onclick="go('Plan Trip')">${t('alerts.findRoute')}</button>
    </div>
  </div>`;
}

window.selectAlert = (i) => {
  state.selectedAlert = state.top10Alerts[i] || null;
  window.render();
};
