// NER SmartLogix — Government of India Official Render Engine

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';
import { initAnimations } from './animations.js';

const PAGES = ['Home', 'Plan Trip', 'Live Network', 'My Trip', 'Facilities', 'Alerts', 'Help & Safety', 'Feedback'];

const PAGE_META = {
  'Home': { en: 'Home', hi: 'मुख्य पृष्ठ', icon: '🏛️' },
  'Plan Trip': { en: 'Plan Journey', hi: 'यात्रा योजना', icon: '⇄' },
  'Live Network': { en: 'Live Network Map', hi: 'लाइव मैप', icon: '◎' },
  'My Trip': { en: 'My Trips & Permits', hi: 'मेरी यात्राएं', icon: '📋' },
  'Facilities': { en: 'Highway Amenities', hi: 'राजमार्ग सुविधाएं', icon: '◇' },
  'Alerts': { en: 'Hazard Alerts', hi: 'आपदा व मौसम अलर्ट', icon: '⚠️' },
  'Help & Safety': { en: 'Driver SOS 1033', hi: 'चालक सहायता 1033', icon: '✚' },
  'Feedback': { en: 'Grievance / Feedback', hi: 'जन शिकायत', icon: '↗' }
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

// ─── 1. TOP ACCESSIBILITY STRIP & NATIONAL TRICOLOR ─────────────────────────
function topAccessibilityBar() {
  const istTime = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  return `
  <div class="gov-tricolor-bar"></div>
  <div class="gov-top-bar">
    <div style="display:flex;align-items:center;gap:14px">
      <span><b>भारत सरकार</b> | Government of India</span>
      <span style="color:#cbd5e1">|</span>
      <span>${istTime} (IST)</span>
    </div>
    <div class="gov-access-controls">
      <span>Text Size:</span>
      <button class="access-btn" onclick="document.body.style.fontSize='13px'" title="Decrease Font">A-</button>
      <button class="access-btn" onclick="document.body.style.fontSize='14px'" title="Normal Font">A</button>
      <button class="access-btn" onclick="document.body.style.fontSize='15px'" title="Increase Font">A+</button>
      <span style="color:#cbd5e1">|</span>
      <a href="javascript:void(0)" onclick="go('Help & Safety')">Screen Reader Access</a>
      <span style="color:#cbd5e1">|</span>
      <a href="javascript:void(0)" onclick="go('Feedback')">Grievances</a>
    </div>
  </div>`;
}

// ─── 2. OFFICIAL MINISTRY HEADER (Ashoka Lion Capital Emblem) ───────────────
function ministryHeader() {
  return `
  <div class="gov-ministry-header">
    <div class="gov-header-container">
      <a href="javascript:void(0)" class="gov-brand-wrap" onclick="go('Home')">
        <!-- National Emblem of India (Ashoka Lion Capital) -->
        <svg class="emblem-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <g fill="#fef08a" stroke="#d97706" stroke-width="1.5">
            <path d="M50 8 C40 8, 30 18, 30 32 C30 42, 38 52, 50 54 C62 52, 70 42, 70 32 C70 18, 60 8, 50 8 Z" fill="#facc15" />
            <circle cx="50" cy="30" r="14" fill="#eab308" />
            <path d="M22 28 C14 34, 18 52, 28 56 C34 50, 32 38, 22 28 Z" fill="#facc15" />
            <path d="M78 28 C86 34, 82 52, 72 56 C66 50, 68 38, 78 28 Z" fill="#facc15" />
            <rect x="24" y="58" width="52" height="12" rx="3" fill="#eab308" />
            <circle cx="50" cy="64" r="5" fill="#1e3a8a" stroke="#ffffff" stroke-width="1" />
            <rect x="18" y="74" width="64" height="8" rx="2" fill="#ca8a04" />
          </g>
          <text x="50" y="96" font-family="'Segoe UI', sans-serif" font-size="11" font-weight="900" fill="#fef08a" text-anchor="middle">सत्यमेव जयते</text>
          <text x="50" y="108" font-family="'Segoe UI', sans-serif" font-size="7.5" font-weight="700" fill="#e2e8f0" text-anchor="middle">GOVERNMENT OF INDIA</text>
        </svg>

        <div class="gov-title-stack">
          <div class="gov-title-hi">सड़क परिवहन और राजमार्ग मंत्रालय एवं पूर्वोत्तर क्षेत्र विकास मंत्रालय</div>
          <div class="gov-title-en">Ministry of Road Transport and Highways & Ministry of Development of NER</div>
          <div class="gov-portal-name">
            <span>राष्ट्रीय रसद आसूचना मंच —</span> NER SmartLogix Portal
          </div>
        </div>
      </a>

      <div class="gov-badges-right">
        <div class="initiative-badge" style="border-color:#fef08a;color:#fef08a">
          <span>⚡ PM GatiShakti</span>
        </div>
        <div class="initiative-badge">
          <span>🇮🇳 Digital India</span>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── 3. OFFICIAL HORIZONTAL NAVIGATION MENU ─────────────────────────────────
function governmentNavbar() {
  const initial = state.user?.name ? state.user.name[0].toUpperCase() : 'U';
  const alertCount = state.top10Alerts.length;

  return `
  <nav class="gov-nav-bar">
    <div class="gov-nav-container">
      <div class="gov-nav-links">
        ${PAGES.map(p => {
          const meta = PAGE_META[p] || { en: p, hi: p, icon: '•' };
          return `
          <button class="${state.page === p ? 'active' : ''}" onclick="go('${p}')">
            <span>${meta.icon}</span>
            <span>${meta.hi} / ${meta.en}</span>
            ${p === 'Alerts' && alertCount ? `<span class="gov-nav-badge">${alertCount}</span>` : ''}
          </button>`;
        }).join('')}
      </div>

      <div class="gov-nav-right">
        <select class="gov-lang-select" onchange="changeLang(this.value)">
          ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
        </select>

        ${state.user
          ? `<button class="gov-btn-login" onclick="go('My Trip')">
               <span>👤</span> ${esc(state.user.name)}
             </button>`
          : `<button class="gov-btn-login" onclick="openAuth('login')">
               <span>🔐</span> Parivahan Login
             </button>`
        }
      </div>
    </div>
  </nav>`;
}

// ─── 4. LIVE EMERGENCY ALERT MARQUEE TICKER ─────────────────────────────────
function alertTickerMarquee() {
  const alerts = state.top10Alerts;
  const marqueeText = alerts.length > 0
    ? alerts.map(a => `[${a.state || 'NER'}] ${a.title} — ${a.alertType} (${a.severity})`).join(' &nbsp;&nbsp; | &nbsp;&nbsp; ')
    : 'No active critical road closures reported. Monsoon surveillance active on NH27, NH29, and NH37 corridors. Drive with caution in hill districts.';

  return `
  <div class="gov-ticker-wrap">
    <div class="gov-ticker-badge">
      <span>⚠️</span> महत्वपूर्ण सूचना / ALERT
    </div>
    <div class="gov-ticker-marquee">
      <div class="gov-ticker-content">
        ${marqueeText}
      </div>
    </div>
    <button class="link" style="font-size:11px;font-weight:700;color:#b91c1c;padding:0 14px;white-space:nowrap" onclick="openSectionPopup('Alerts')">
      सभी अलर्ट देखें / View All Alerts →
    </button>
  </div>`;
}

// ─── 5. SECTION POPUP MODAL (Requirement #5) ────────────────────────────────
async function renderSectionPopup() {
  if (!state.activePopupSection) return '';
  
  const sectionName = state.activePopupSection;
  const meta = PAGE_META[sectionName] || { en: sectionName, hi: sectionName, icon: '◉' };
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
            <b style="font-size:16px;color:var(--gov-navy)">${meta.hi} / ${meta.en}</b>
            <div style="font-size:11px;color:#64748b">Official Government of India Logistics Service</div>
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

// ─── 6. OFFICIAL 4-COLUMN GOVERNMENT FOOTER ─────────────────────────────────
function officialGovernmentFooter() {
  const currentYear = new Date().getFullYear();

  return `
  <footer class="gov-footer">
    <div class="gov-footer-main">
      <div class="gov-footer-col">
        <h4>केंद्रीय मंत्रालय एवं निकाय / Ministries</h4>
        <ul>
          <li><a href="https://morth.nic.in" target="_blank" rel="noopener">सड़क परिवहन और राजमार्ग मंत्रालय (MoRTH)</a></li>
          <li><a href="https://mdoner.gov.in" target="_blank" rel="noopener">पूर्वोत्तर क्षेत्र विकास मंत्रालय (MDoNER)</a></li>
          <li><a href="https://necouncil.gov.in" target="_blank" rel="noopener">उत्तर पूर्वी परिषद (North Eastern Council)</a></li>
          <li><a href="https://nhai.gov.in" target="_blank" rel="noopener">भारतीय राष्ट्रीय राजमार्ग प्राधिकरण (NHAI)</a></li>
          <li><a href="https://ndma.gov.in" target="_blank" rel="noopener">राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA)</a></li>
        </ul>
      </div>

      <div class="gov-footer-col">
        <h4>नीति एवं विधिक जानकारी / Policies</h4>
        <ul>
          <li><a href="javascript:void(0)" onclick="notify('National Logistics Policy (NLP) 2022 Integrated','info')">राष्ट्रीय रसद नीति (National Logistics Policy)</a></li>
          <li><a href="javascript:void(0)" onclick="notify('Website complies with GIGW 3.0 Standards','info')">वेबसाइट नीतियां (Website Policies - GIGW)</a></li>
          <li><a href="javascript:void(0)" onclick="notify('Privacy Policy: All driver telemetry encrypted','info')">गोपनीयता नीति (Privacy Policy)</a></li>
          <li><a href="javascript:void(0)" onclick="notify('Terms of Service: Authorized for commercial freight','info')">नियम एवं शर्तें (Terms and Conditions)</a></li>
          <li><a href="javascript:void(0)" onclick="go('Help & Safety')">सुलभता विवरण (Accessibility Statement)</a></li>
        </ul>
      </div>

      <div class="gov-footer-col">
        <h4>चालक सहायता एवं नियंत्रण कक्ष / Helplines</h4>
        <ul>
          <li><span style="color:#fef08a;font-weight:700">🚨 राष्ट्रीय आपातकालीन नंबर:</span> 112</li>
          <li><span style="color:#fef08a;font-weight:700">🛣️ NHAI राजमार्ग हेल्पलाइन:</span> 1033 (टोल फ्री)</li>
          <li><span style="color:#fef08a;font-weight:700">🌊 NDMA आपदा नियंत्रण:</span> 1078</li>
          <li><span style="color:#fef08a;font-weight:700">🌧️ IMD मौसम चेतावनी सेवा:</span> 1800-180-1717</li>
          <li><span style="color:#fef08a;font-weight:700">⛽ पूर्वोत्तर ईंधन सहायता:</span> 1800-233-3555</li>
        </ul>
      </div>

      <div class="gov-footer-col">
        <h4>पोर्टल सूचना / Portal Info</h4>
        <p style="font-size:12px;line-height:1.6;color:#94a3b8">
          यह पोर्टल पूर्वोत्तर परिषद (NEC) और सड़क परिवहन व राजमार्ग मंत्रालय के तत्वावधान में पूर्वोत्तर के 8 राज्यों में निर्बाध व्यावसायिक परिवहन हेतु विकसित किया गया है।
        </p>
        <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
          <span class="badge warning" style="background:#451a03;border-color:#b45309;color:#fef08a">
            आगंतुक संख्या / Visitors: 1,842,910
          </span>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#64748b">
          अंतिम अद्यतन: 09 सितंबर 2026
        </div>
      </div>
    </div>

    <div class="gov-footer-bottom">
      <div>
        सामग्री स्वामित्व: <b>उत्तर पूर्वी परिषद एवं सड़क परिवहन और राजमार्ग मंत्रालय, भारत सरकार</b>
      </div>
      <div style="margin-top:6px">
        Designed, Developed & Hosted by <b>National Informatics Centre (NIC) / Cloud Infrastructure</b>
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
    topAccessibilityBar() +
    ministryHeader() +
    governmentNavbar() +
    alertTickerMarquee() +
    `<main><div id="page-content" class="page-enter">${content}</div></main>` +
    officialGovernmentFooter() +
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