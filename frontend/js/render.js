// NER SmartLogix — Modern Logistics Portal (Official Public Portal Style)

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';
import { initAnimations } from './animations.js';

const PAGES = ['Home', 'Plan Trip', 'Live Network', 'My Trip', 'Facilities', 'Alerts', 'Help & Safety', 'Feedback'];

const PAGE_META = {
  'Home': { label: 'Home', icon: '🏛️' },
  'Plan Trip': { label: 'Plan Trip', icon: '⇄' },
  'Live Network': { label: 'Live Map', icon: '◎' },
  'Facilities': { label: 'Facilities', icon: '◇' },
  'Alerts': { label: 'Alerts', icon: '⚠️' },
  'My Trip': { label: 'My Trips', icon: '📋' },
  'Help & Safety': { label: 'Safety & SOS', icon: '✚' },
  'Feedback': { label: 'Feedback', icon: '↗' }
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'brx', label: 'Bodo' },
  { code: 'mni', label: 'মেইতেই (Manipuri)' },
  { code: 'kha', label: 'Khasi' },
  { code: 'grt', label: 'Garo' },
  { code: 'lus', label: 'Mizo' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'kok', label: 'Kokborok' }
];

export function notify(message, type = 'success') {
  state.toast = { message, type };
  render();
  setTimeout(() => { state.toast = { message: '', type: 'success' }; render(); }, 3500);
}

// ─── 1. TOP UTILITY STRIP WITH TRICOLOR ACCENT ──────────────────────────────
function topUtilityBar() {
  const istTime = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  return `
  <div class="gov-tricolor-bar"></div>
  <div class="gov-top-bar">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-weight:700;color:#002147">NER Logistics Portal</span>
      <span style="color:#cbd5e1">|</span>
      <span>North Eastern Region Highway Intelligence</span>
      <span style="color:#cbd5e1">|</span>
      <span>${istTime}</span>
    </div>
    <div class="gov-access-controls">
      <span>Font:</span>
      <button class="access-btn" onclick="document.body.style.fontSize='13px'" title="Decrease Font">A-</button>
      <button class="access-btn" onclick="document.body.style.fontSize='14px'" title="Normal Font">A</button>
      <button class="access-btn" onclick="document.body.style.fontSize='15px'" title="Increase Font">A+</button>
      <span style="color:#cbd5e1">|</span>
      <select class="gov-lang-select" onchange="changeLang(this.value)">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
    </div>
  </div>`;
}

// ─── 2. PORTAL BRANDING HEADER ──────────────────────────────────────────────
function portalHeader() {
  return `
  <div class="gov-ministry-header">
    <div class="gov-header-container">
      <a href="javascript:void(0)" class="gov-brand-wrap" onclick="go('Home')">
        <div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#ff9933,#d97706);color:#00152e;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
          ◉
        </div>
        <div class="gov-title-stack">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#cbd5e1;font-weight:700">
            Northeast Corridor Intelligence
          </div>
          <div class="gov-portal-name">
            NER <span>SmartLogix</span>
          </div>
          <div style="font-size:11.5px;color:#94a3b8">
            Freight & Highway Logistics Platform · 8 North Eastern States
          </div>
        </div>
      </a>

      <div class="gov-badges-right">
        <div class="initiative-badge">
          <span>⚡ Live OSRM Routing</span>
        </div>
        <div class="initiative-badge">
          <span>🛰 IMD Weather & Hazards</span>
        </div>
        ${state.user
          ? `<button class="gov-btn-login" onclick="go('My Trip')">
               <span>👤</span> ${esc(state.user.name)}
             </button>`
          : `<button class="gov-btn-login" onclick="openAuth('login')">
               <span>🔐</span> Driver Login
             </button>`
        }
      </div>
    </div>
  </div>`;
}

// ─── 3. TOP HORIZONTAL NAVIGATION BAR ───────────────────────────────────────
function navigationBar() {
  const alertCount = state.top10Alerts.length;

  return `
  <nav class="gov-nav-bar">
    <div class="gov-nav-container">
      <div class="gov-nav-links">
        ${PAGES.map(p => {
          const meta = PAGE_META[p] || { label: p, icon: '•' };
          return `
          <button class="${state.page === p ? 'active' : ''}" onclick="go('${p}')">
            <span>${meta.icon}</span>
            <span>${meta.label}</span>
            ${p === 'Alerts' && alertCount ? `<span class="gov-nav-badge">${alertCount}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>
  </nav>`;
}

// ─── 4. LIVE CORRIDOR ALERTS MARQUEE ────────────────────────────────────────
function alertMarqueeTicker() {
  const alerts = state.top10Alerts;
  const marqueeText = alerts.length > 0
    ? alerts.map(a => `[${a.state || 'NER'}] ${a.title} — ${a.alertType} (${a.severity})`).join(' &nbsp;&nbsp; | &nbsp;&nbsp; ')
    : 'All major NER highways operational. Monsoon weather surveillance active on NH27, NH29, and NH37 corridors. Drive cautiously on hill roads.';

  return `
  <div class="gov-ticker-wrap">
    <div class="gov-ticker-badge">
      <span>⚠️</span> LIVE ALERTS
    </div>
    <div class="gov-ticker-marquee">
      <div class="gov-ticker-content">
        ${marqueeText}
      </div>
    </div>
    <button class="link" style="font-size:11px;font-weight:700;color:#b91c1c;padding:0 14px;white-space:nowrap" onclick="openSectionPopup('Alerts')">
      View All Alerts (${alerts.length}) →
    </button>
  </div>`;
}

// ─── 5. SECTION POPUP MODAL (Requirement #5) ────────────────────────────────
async function renderSectionPopup() {
  if (!state.activePopupSection) return '';
  
  const sectionName = state.activePopupSection;
  const meta = PAGE_META[sectionName] || { label: sectionName, icon: '◉' };
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
          <span style="font-size:20px">${meta.icon}</span>
          <div>
            <b style="font-size:16px;color:var(--gov-navy)">${meta.label}</b>
            <div style="font-size:11px;color:#64748b">NER SmartLogix Service Window</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn primary" style="font-size:11.5px;padding:5px 12px" onclick="closeSectionPopup(); go('${sectionName}')">Open Full Page ↗</button>
          <button class="btn" style="padding:4px 10px;font-size:13px" onclick="closeSectionPopup()">✕ Close</button>
        </div>
      </div>
      <div class="section-modal-body">
        ${sectionHtml}
      </div>
    </div>
  </div>`;
}

// ─── 6. CLEAN, PROFESSIONAL PORTAL FOOTER ───────────────────────────────────
function portalFooter() {
  return `
  <footer class="gov-footer">
    <div class="gov-footer-main">
      <div class="gov-footer-col">
        <h4>NER SmartLogix Portal</h4>
        <p style="font-size:12px;line-height:1.6;color:#94a3b8">
          Dedicated logistics intelligence, commercial route risk scoring, and real-time highway hazard monitoring across Assam, Meghalaya, Arunachal Pradesh, Manipur, Mizoram, Nagaland, Sikkim, and Tripura.
        </p>
        <div style="margin-top:12px">
          <span class="badge" style="background:#001f3f;border-color:#334155;color:#fef08a">
            Corridors Monitored: 12,500+ KM
          </span>
        </div>
      </div>

      <div class="gov-footer-col">
        <h4>Key Logistics Services</h4>
        <ul>
          <li><a href="javascript:void(0)" onclick="go('Plan Trip')">Commercial Route Risk Calculator</a></li>
          <li><a href="javascript:void(0)" onclick="go('Live Network')">Live Corridor Map & GPS Tracking</a></li>
          <li><a href="javascript:void(0)" onclick="go('Facilities')">Highway Amenities & Fuel Locator</a></li>
          <li><a href="javascript:void(0)" onclick="go('Alerts')">Landslide & Weather Hazard Feed</a></li>
          <li><a href="javascript:void(0)" onclick="go('Feedback')">Submit Road Observation</a></li>
        </ul>
      </div>

      <div class="gov-footer-col">
        <h4>Emergency Helplines (24/7)</h4>
        <ul>
          <li><span style="color:#fef08a;font-weight:700">🚨 National Emergency:</span> 112</li>
          <li><span style="color:#fef08a;font-weight:700">🛣️ NHAI Highway Helpline:</span> 1033 (Toll Free)</li>
          <li><span style="color:#fef08a;font-weight:700">🌊 Disaster Control:</span> 1078</li>
          <li><span style="color:#fef08a;font-weight:700">🌧️ IMD Weather Warning:</span> 1800-180-1717</li>
          <li><span style="color:#fef08a;font-weight:700">⛽ Fuel Emergency Support:</span> 1800-233-3555</li>
        </ul>
      </div>

      <div class="gov-footer-col">
        <h4>States Covered</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#94a3b8">
          <div>• Assam</div>
          <div>• Meghalaya</div>
          <div>• Arunachal Pradesh</div>
          <div>• Manipur</div>
          <div>• Nagaland</div>
          <div>• Mizoram</div>
          <div>• Sikkim</div>
          <div>• Tripura</div>
        </div>
        <div style="margin-top:14px;font-size:11px;color:#64748b">
          System Operational · 24/7 Live Monitoring
        </div>
      </div>
    </div>

    <div class="gov-footer-bottom">
      <div>
        © NER SmartLogix — Intelligent Logistics Platform for Northeast India. All rights reserved.
      </div>
    </div>
  </footer>`;
}

function toastEl() {
  if (!state.toast.message) return '';
  const isError = state.toast.type === 'error';
  return `
  <div class="toast" style="${isError ? 'border-color:#fca5a5;background:#fef2f2;color:#b91c1c' : 'border-color:#99f6e4;background:#f0fdfa;color:#0f766e'}">
    <span style="font-weight:bold">${isError ? '✗' : '✓'}</span>
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
    topUtilityBar() +
    portalHeader() +
    navigationBar() +
    alertMarqueeTicker() +
    `<main><div id="page-content" class="page-enter">${content}</div></main>` +
    portalFooter() +
    popupHtml +
    toastEl() +
    renderAuthModal();

  // Initialize interactive animations
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