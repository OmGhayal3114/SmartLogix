// NER SmartLogix — Render engine

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';
import { initAnimations } from './animations.js';

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
  const initial = state.user?.name ? state.user.name[0].toUpperCase() : 'U';
  return `
  <aside class="sidebar ${state.menu ? 'open' : ''}">
    <div class="side-logo">
      <div class="logo">
        <div class="logo-icon">◉</div>
        <span>NER <b>SmartLogix</b></span>
      </div>
      <small>${t('nav.tagline')}</small>
    </div>

    <div class="side-status">
      <div class="side-status-dot"></div>
      <span>Network Operational · NER</span>
    </div>

    <div class="nav">
      <div class="nav-title">Navigation</div>

      ${PAGES.map(p => `
      <button class="${state.page === p ? 'active' : ''}" onclick="go('${p}')">
        <span class="nav-icon">${PAGE_ICONS[p]}</span>
        <span>${t(PAGE_I18N_KEYS[p]) || p}</span>
        ${p === 'Alerts' && state.top10Alerts.length ? `<span class="count">${state.top10Alerts.length}</span>` : ''}
      </button>`).join('')}

      <!-- Language selector in sidebar -->
      <div style="margin-top:16px;padding:0 2px">
        <div class="eyebrow" style="padding:6px 10px">${t('lang.select')}</div>
        <select class="field" style="background:#060e1c;color:#e8edf5;border:1px solid #1e3a5f40;border-radius:10px;padding:8px 12px;width:100%;font-size:12px" onchange="changeLang(this.value)">
          ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="side-bottom">
      ${state.user
        ? `<div class="side-user">
             <div class="side-avatar">${initial}</div>
             <div style="overflow:hidden">
               <div style="font-size:12px;font-weight:600;white-space:nowrap;text-overflow:ellipsis;overflow:hidden">${esc(state.user.name)}</div>
               <div style="font-size:10px;color:var(--muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden">${esc(state.user.email)}</div>
             </div>
           </div>
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
      <div class="logo-icon" style="width:28px;height:28px;font-size:14px">◉</div>
      <span class="logo" style="font-size:15px">NER <b>SmartLogix</b></span>
    </button>
    <div style="display:flex;gap:8px;align-items:center">
      <select style="background:#0f1929;color:#fff;border:1px solid #1e3a5f40;border-radius:8px;padding:6px 8px;font-size:11px" onchange="changeLang(this.value)">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <button class="mobile-menu" onclick="state.menu=!state.menu;render()">☰</button>
    </div>
  </header>`;
}

function topbar() {
  return `
  <div class="topbar">
    <div class="topbar-left">
      <div class="topbar-eyebrow">Logistics Intelligence Platform</div>
      <div class="topbar-title">${state.page}</div>
    </div>
    <div class="topbar-actions">
      <select onchange="changeLang(this.value)">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <button onclick="go('Alerts')">🔔 ${state.top10Alerts.length ? `<span class="badge warning" style="margin-left:4px;padding:1px 6px">${state.top10Alerts.length}</span>` : ''}</button>
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

  // Wire up all animations after every render
  initAnimations();
}

// Expose render globally so auth.js and pages can call it
window.render = render;
