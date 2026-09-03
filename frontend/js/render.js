// NER SmartLogix — Render engine

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';

const PAGES = ['Plan Trip', 'Live Network', 'My Trip', 'Facilities', 'Alerts', 'Help & Safety', 'Feedback'];
const PAGE_ICONS = {
  'Plan Trip': '⇄', 'Live Network': '◎', 'My Trip': '▣',
  'Facilities': '◇', 'Alerts': '!', 'Help & Safety': '✚', 'Feedback': '↗'
};
const PAGE_I18N_KEYS = {
  'Plan Trip': 'nav.planTrip',
  'Live Network': 'nav.liveNetwork',
  'My Trip': 'nav.myTrip',
  'Facilities': 'nav.facilities',
  'Alerts': 'nav.alerts',
  'Help & Safety': 'nav.help',
  'Feedback': 'nav.feedback'
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'brx', label: 'Bodo' },
  { code: 'mni', label: 'মেইতেই' },
  { code: 'kha', label: 'Khasi' },
  { code: 'grt', label: 'Garo' },
  { code: 'lus', label: 'Mizo' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'kok', label: 'Kokborok' }
];

export function notify(message, type = 'success') {
  state.toast = { message, type };
  render();
  setTimeout(() => { state.toast = { message: '', type: 'success' }; render(); }, 3000);
}

function sidebar() {
  return `
  <aside class="sidebar ${state.menu ? 'open' : ''}">
    <div class="side-logo">
      <div class="logo">◉ NER <b>SmartLogix</b></div>
      <small>${t('nav.tagline')}</small>
    </div>

    <div class="nav">
      <div class="nav-title">Navigation</div>

      ${PAGES.map(p => `
      <button class="${state.page === p ? 'active' : ''}" onclick="go('${p}')">
        ${PAGE_ICONS[p]} &nbsp; ${t(PAGE_I18N_KEYS[p]) || p}
        ${p === 'Alerts' && state.top10Alerts.length ? `<span class="count">${state.top10Alerts.length}</span>` : ''}
      </button>`).join('')}

      <!-- Language selector in sidebar -->
      <div style="margin-top:16px;padding:0 4px">
        <div class="eyebrow" style="padding:8px 8px 6px">${t('lang.select')}</div>
        <select class="field" style="background:#0b0f1a;color:#e8edf5;border:1px solid #ffffff16;border-radius:8px;padding:8px;width:100%" onchange="changeLang(this.value)">
          ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="side-bottom">
      ${state.user
        ? `<div style="padding:0 4px;margin-bottom:8px"><span style="color:var(--teal);font-size:11px">◉</span> <span style="font-size:12px">${esc(state.user.name)}</span></div>
           <button onclick="handleLogout()">⬡ Logout</button>`
        : `<button onclick="openAuth('login')">${t('nav.login')} / ${t('nav.signup')}</button>`
      }
    </div>
  </aside>`;
}

function mobileHeader() {
  return `
  <header class="mobile-header">
    <button class="mobile-menu" onclick="go('Plan Trip')">
      ◉ <span class="logo">NER <b>SmartLogix</b></span>
    </button>
    <div style="display:flex;gap:8px">
      <select style="background:#111827;color:#fff;border:1px solid #ffffff18;border-radius:8px;padding:6px 8px;font-size:11px" onchange="changeLang(this.value)">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <button class="mobile-menu" onclick="state.menu=!state.menu;render()">☰</button>
    </div>
  </header>`;
}

function topbar() {
  return `
  <div class="topbar">
    <div>
      <div class="eyebrow" style="color:var(--teal)">Logistics Intelligence Platform</div>
      <b style="display:block;margin-top:5px">${state.page}</b>
    </div>
    <div class="topbar-actions">
      <select style="background:#111827;color:#cbd5e1;border:1px solid #ffffff14;padding:11px 12px;border-radius:8px;font-size:12px" onchange="changeLang(this.value)">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <button onclick="go('Alerts')">🔔</button>
      ${state.user
        ? `<button onclick="handleLogout()">${t('nav.logout')}</button>`
        : `<button onclick="openAuth('login')" class="btn primary">${t('nav.login')}</button>`
      }
    </div>
  </div>`;
}

function toastEl() {
  if (!state.toast.message) return '';
  const isError = state.toast.type === 'error';
  return `
  <div class="toast" style="${isError ? 'border-color:#ef444455;background:#1a0a0a' : ''}">
    <span style="color:${isError ? 'var(--red)' : 'var(--teal)'}">${isError ? '✗' : '✓'}</span>
    ${esc(state.toast.message)}
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

async function pageContent() {
  switch (state.page) {
    case 'Plan Trip': {
      const { renderPlanPage } = await import('./pages/plan.js');
      return renderPlanPage();
    }
    case 'Live Network': {
      const { renderLivePage } = await import('./pages/live.js');
      return renderLivePage();
    }
    case 'My Trip': {
      const { renderMyTripPage } = await import('./pages/mytrip.js');
      return renderMyTripPage();
    }
    case 'Facilities': {
      const { renderFacilitiesPage } = await import('./pages/facilities.js');
      return renderFacilitiesPage();
    }
    case 'Alerts': {
      const { renderAlertsPage } = await import('./pages/alerts.js');
      return renderAlertsPage();
    }
    case 'Help & Safety': {
      const { renderHelpPage } = await import('./pages/help.js');
      return renderHelpPage();
    }
    case 'Feedback': {
      const { renderFeedbackPage } = await import('./pages/feedback.js');
      return renderFeedbackPage();
    }
    default: {
      const { renderPlanPage } = await import('./pages/plan.js');
      return renderPlanPage();
    }
  }
}

export async function render() {
  const content = await pageContent();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML =
    mobileHeader() +
    sidebar() +
    `<main>${topbar()}<div id="page-content">${content}</div></main>` +
    toastEl() +
    renderAuthModal();
}

// Expose render globally so auth.js and pages can call it
window.render = render;
