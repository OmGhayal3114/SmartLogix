// NER SmartLogix — Render engine (Top Navigation & Light Theme)

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';
import { initAnimations } from './animations.js';

const PAGES = ['Home', 'Plan Trip', 'Live Network', 'My Trip', 'Facilities', 'Alerts', 'Help & Safety', 'Feedback'];
const PAGE_ICONS = {
  'Home': '🏠',
  'Plan Trip': '⇄',
  'Live Network': '◎',
  'My Trip': '▣',
  'Facilities': '◇',
  'Alerts': '🚨',
  'Help & Safety': '✚',
  'Feedback': '↗'
};
const PAGE_I18N_KEYS = {
  'Home': 'nav.home',
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

// TOP NAVIGATION BAR (Replaces sidebar entirely - Requirement #1)
function topNavbar() {
  const initial = state.user?.name ? state.user.name[0].toUpperCase() : 'U';
  const alertCount = state.top10Alerts.length;

  return `
  <header class="top-navbar">
    <!-- Brand Logo -->
    <a href="javascript:void(0)" class="nav-brand" onclick="go('Home')">
      <div class="brand-icon">◉</div>
      <div class="brand-info">
        <div class="brand-title">NER <span>SmartLogix</span></div>
        <div class="brand-sub">Northeast Logistics Intelligence</div>
      </div>
    </a>

    <!-- Center Navigation Links -->
    <nav class="nav-links ${state.menu ? 'mobile-open' : ''}" id="top-nav-links">
      ${PAGES.map(p => `
      <button class="${state.page === p ? 'active' : ''}" onclick="go('${p}')">
        <span>${PAGE_ICONS[p]}</span>
        <span>${t(PAGE_I18N_KEYS[p]) || p}</span>
        ${p === 'Alerts' && alertCount ? `<span class="nav-count">${alertCount}</span>` : ''}
      </button>`).join('')}
    </nav>

    <!-- Right Controls: Language & Driver Auth -->
    <div class="nav-actions">
      <select onchange="changeLang(this.value)" title="Choose Language">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>

      ${state.user
        ? `<div class="user-profile-capsule" onclick="go('My Trip')" style="cursor:pointer" title="View Profile & Trips">
             <div class="user-avatar-circle">${initial}</div>
             <span style="font-size:12px;font-weight:700;color:var(--text);max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state.user.name)}</span>
             <button class="link" style="font-size:11px;color:var(--red);padding:0 2px" onclick="event.stopPropagation();handleLogout()">Logout</button>
           </div>`
        : `<button class="btn-auth primary" onclick="openAuth('login')">
             <span>👤</span> ${t('nav.login')}
           </button>`
      }

      <button class="mobile-nav-toggle" onclick="state.menu = !state.menu; render()" aria-label="Toggle Navigation">
        ☰
      </button>
    </div>
  </header>`;
}

// SECTION POPUP MODAL (Requirement #5: "for every section new page should be open or pop up")
async function renderSectionPopup() {
  if (!state.activePopupSection) return '';
  
  const sectionName = state.activePopupSection;
  let sectionHtml = '';
  
  try {
    switch (sectionName) {
      case 'Plan Trip': {
        const { renderPlanPage } = await import('./pages/plan.js');
        sectionHtml = renderPlanPage();
        break;
      }
      case 'Live Network': {
        const { renderLivePage } = await import('./pages/live.js');
        sectionHtml = renderLivePage();
        break;
      }
      case 'Alerts': {
        const { renderAlertsPage } = await import('./pages/alerts.js');
        sectionHtml = renderAlertsPage();
        break;
      }
      case 'Facilities': {
        const { renderFacilitiesPage } = await import('./pages/facilities.js');
        sectionHtml = renderFacilitiesPage();
        break;
      }
      case 'My Trip': {
        const { renderMyTripPage } = await import('./pages/mytrip.js');
        sectionHtml = renderMyTripPage();
        break;
      }
      case 'Help & Safety': {
        const { renderHelpPage } = await import('./pages/help.js');
        sectionHtml = renderHelpPage();
        break;
      }
      case 'Feedback': {
        const { renderFeedbackPage } = await import('./pages/feedback.js');
        sectionHtml = renderFeedbackPage();
        break;
      }
      default:
        sectionHtml = `<div class="empty"><div>Section not found</div></div>`;
    }
  } catch (err) {
    sectionHtml = `<div class="empty"><div>Error loading section: ${esc(err.message)}</div></div>`;
  }

  return `
  <div class="section-modal-backdrop" onclick="if(event.target===this)closeSectionPopup()">
    <div class="section-modal-window">
      <div class="section-modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${PAGE_ICONS[sectionName] || '◉'}</span>
          <b style="font-size:17px;color:var(--text)">${sectionName}</b>
          <span class="badge info">Interactive Pop-up View</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn" style="font-size:12px;padding:6px 12px" onclick="closeSectionPopup(); go('${sectionName}')">Open Full Page ↗</button>
          <button class="modal-close-btn" onclick="closeSectionPopup()" title="Close">✕</button>
        </div>
      </div>
      <div class="section-modal-body">
        ${sectionHtml}
      </div>
    </div>
  </div>`;
}

function toastEl() {
  if (!state.toast.message) return '';
  const isError = state.toast.type === 'error';
  return `
  <div class="toast" style="${isError ? 'border-color:var(--red-border);background:var(--red-light);color:var(--red)' : ''}">
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
    case 'Home': {
      const { renderHomePage } = await import('./pages/home.js');
      return renderHomePage();
    }
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
      const { renderHomePage } = await import('./pages/home.js');
      return renderHomePage();
    }
  }
}

export async function render() {
  const content = await pageContent();
  const popupHtml = await renderSectionPopup();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML =
    topNavbar() +
    `<main><div id="page-content" class="page-enter">${content}</div></main>` +
    popupHtml +
    toastEl() +
    renderAuthModal();

  // Wire up all animations & interactive counters after render
  initAnimations();
}

// Global modal pop-up controls (Requirement #5)
window.openSectionPopup = (sectionName) => {
  state.activePopupSection = sectionName;
  render();
};

window.closeSectionPopup = () => {
  state.activePopupSection = null;
  render();
};

// Expose render globally
window.render = render;