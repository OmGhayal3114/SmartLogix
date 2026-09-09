// NER SmartLogix — Alerts page (Redesigned)

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
  const alertRisk = calculateAlertRisk(state.top10Alerts);
  const criticalCount = state.top10Alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = state.top10Alerts.filter(a => a.severity === 'HIGH').length;

  return `
  <section class="content">

    <!-- Hero -->
    <div class="hero" style="--hero-color:var(--orange)">
      <div class="hero-eyebrow" style="color:var(--orange)">Safety Intelligence</div>
      <h1 class="hero-title" style="background:linear-gradient(135deg,#e2eaf5,#fdba74 60%,#fb923c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${t('alerts.title')}</h1>
      <p class="hero-sub">${t('alerts.subtitle')}</p>
      <div class="hero-actions">
        <span class="badge warning">⚡ Live Feed</span>
        ${updatedStr ? `<span class="badge">Updated ${updatedStr}</span>` : ''}
        <span class="badge ${alertRisk > 70 ? 'danger' : alertRisk > 40 ? 'warning' : 'success'}">${alertRisk}% regional risk</span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">!</div>
        <div class="stat-value" data-count="${state.top10Alerts.length}">${state.top10Alerts.length}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--red)">
        <div class="stat-icon">🚨</div>
        <div class="stat-value" data-count="${criticalCount}">${criticalCount}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">⚠</div>
        <div class="stat-value" data-count="${highCount}">${highCount}</div>
        <div class="stat-label">High Severity</div>
      </div>
      <div class="stat-card" style="--stat-color:${alertRisk > 60 ? 'var(--red)' : alertRisk > 30 ? 'var(--orange)' : 'var(--green)'}">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${alertRisk}%</div>
        <div class="stat-label">Risk Level</div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-body">

      ${hasSampleData ? `
      <div class="info-banner warning">
        <span>⚡</span>
        <span>${t('alerts.sampleNote')}</span>
      </div>` : ''}

      ${!state.loadingAlerts && state.top10Alerts.length === 0 ? `
      <div class="info-banner success">
        <span>✓</span>
        <div><b>Safer to travel</b><br><span style="font-size:12px">No active verified NER alerts detected in the latest update.</span></div>
      </div>` : ''}

      ${state.loadingAlerts
        ? `<div class="empty"><div>
            <div class="empty-icon" style="animation:spin 1.2s linear infinite">⟳</div>
            <b>${t('alerts.loading')}</b>
          </div></div>`
        : state.top10Alerts.length === 0
        ? ''
        : state.top10Alerts.map((a, i) => alertItem(a, i, tone)).join('')
      }

      ${state.selectedAlert ? alertDetail(state.selectedAlert, tone) : ''}

    </div>
  </section>`;
}

function alertItem(a, i, tone) {
  const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
  const risk = severityRisk(a.severity);
  const severityColors = { CRITICAL: '#ef4444', HIGH: '#fb923c', MEDIUM: '#fb923c', LOW: '#34d399' };
  const borderColor = severityColors[a.severity] || '#5eead4';
  return `
  <button class="alert" onclick="selectAlert(${i})" style="border-left-color:${borderColor}">
    <div class="row">
      <div style="flex:1">
        <div class="alert-title">${esc(a.title)}</div>
        <div class="alert-meta">${esc(a.state)} &nbsp;·&nbsp; ${esc(a.location)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        <span class="badge ${tone[a.severity] || ''}">${a.severity} · ${risk}%</span>
        ${a.changeType === 'NEW' ? `<span class="badge success">NEW</span>` : a.changeType === 'UPDATED' ? `<span class="badge info">UPDATED</span>` : ''}
      </div>
    </div>
    <div class="row" style="margin-top:8px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge" style="background:#ffffff06">${esc(a.alertType)}</span>
        <span class="muted" style="font-size:11px">${esc(a.source || '')}</span>
      </div>
      <span class="muted" style="white-space:nowrap;font-size:11px">${dateStr}</span>
    </div>
  </button>`;
}

function alertDetail(a, tone) {
  const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
  return `
  <div class="detail" style="border-color:#fb923c33;margin-top:24px;border-left:4px solid var(--orange)">
    <div class="row">
      <div>
        <span class="badge ${tone[a.severity] || ''}">Risk ${severityRisk(a.severity)}%</span>
        <h2 style="margin-top:10px;font-size:18px">${esc(a.title)}</h2>
      </div>
      <button class="link" onclick="state.selectedAlert=null;window.render()">✕ Close</button>
    </div>

    <div class="divider"></div>

    <div class="detail-grid" style="margin-top:0">
      <div><small>${t('alerts.state')}</small><strong style="display:block;margin-top:5px">${esc(a.state)}</strong></div>
      <div><small>${t('alerts.location')}</small><strong style="display:block;margin-top:5px">${esc(a.location)}</strong></div>
      <div><small>Type</small><strong style="display:block;margin-top:5px">${esc(a.alertType)}</strong></div>
      <div><small>Date/Time</small><strong style="display:block;margin-top:5px">${dateStr}</strong></div>
    </div>

    ${a.description ? `<p class="desc" style="margin-top:16px;padding:14px;background:#fb923c08;border-radius:8px;border:1px solid #fb923c20">${esc(a.description)}</p>` : ''}
    ${a.source ? `<div class="muted" style="margin-top:12px;font-size:11px">Source: ${esc(a.source)}</div>` : ''}

    <div style="margin-top:20px">
      <button class="btn primary" onclick="go('Plan Trip')">→ ${t('alerts.findRoute')}</button>
    </div>
  </div>`;
}

function severityRisk(severity) {
  return ({ CRITICAL: 95, HIGH: 75, MEDIUM: 50, LOW: 25 }[severity] || 40);
}

function calculateAlertRisk(alerts) {
  if (!alerts.length) return 0;
  const highest = Math.max(...alerts.map(a => severityRisk(a.severity)));
  return Math.min(99, highest + Math.max(0, alerts.length - 1) * 3);
}

window.selectAlert = (i) => {
  state.selectedAlert = state.top10Alerts[i] || null;
  window.render();
};
