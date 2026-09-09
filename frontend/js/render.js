// NER SmartLogix — Render engine
// Professional Government/Logistics Portal Design

import { state } from './state.js';
import { t } from './i18n.js';
import { renderAuthModal } from './auth.js';
import { initAnimations } from './animations.js';

export const NAV_ITEMS = [
  { id: 'Home', label: 'Home', i18nKey: 'nav.home', icon: 'home' },
  { id: 'Plan Trip', label: 'Plan Trip', i18nKey: 'nav.planTrip', icon: 'alt_route' },
  { id: 'Live Network', label: 'Live Network', i18nKey: 'nav.liveNetwork', icon: 'radar' },
  { id: 'Alerts', label: 'Alerts', i18nKey: 'nav.alerts', icon: 'warning' },
  { id: 'Facilities', label: 'Facilities', i18nKey: 'nav.facilities', icon: 'local_gas_station' },
  { id: 'My Trip', label: 'My Trip', i18nKey: 'nav.myTrip', icon: 'inventory_2' },
  { id: 'Help & Safety', label: 'Help & Safety', i18nKey: 'nav.help', icon: 'emergency' },
  { id: 'Feedback', label: 'Feedback', i18nKey: 'nav.feedback', icon: 'rate_review' }
];

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
  setTimeout(() => {
    state.toast = { message: '', type: 'success' };
    render();
  }, 3200);
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

// Top Navigation Bar
function header() {
  const isHome = state.page === 'Home';
  const isScrolled = !isHome || (typeof window !== 'undefined' && window.scrollY > 40);

  return `
  <header class="site-header ${isScrolled ? 'scrolled' : ''}" id="site-header">
    <div class="header-inner">
      <!-- Left: Portal Brand -->
      <div class="brand" onclick="go('Home')" title="NER SmartLogix Portal Home">
        <div class="brand-emblem">
          <span class="material-symbols-outlined brand-icon">hub</span>
        </div>
        <div class="brand-text">
          <div class="brand-name">NER <span>SmartLogix</span></div>
          <div class="brand-tag">LOGISTICS INTELLIGENCE PORTAL · NER</div>
        </div>
      </div>

      <!-- Center: Horizontal Navigation -->
      <nav class="header-nav">
        ${NAV_ITEMS.map(item => {
          const isActive = state.page === item.id;
          const hasCount = item.id === 'Alerts' && state.top10Alerts.length > 0;
          return `
            <button class="nav-item ${isActive ? 'active' : ''}" onclick="go('${item.id}')">
              <span class="material-symbols-outlined nav-item-icon">${item.icon}</span>
              <span class="nav-item-text">${t(item.i18nKey) || item.label}</span>
              ${hasCount ? `<span class="nav-badge">${state.top10Alerts.length}</span>` : ''}
            </button>
          `;
        }).join('')}
      </nav>

      <!-- Right: Actions & Tools -->
      <div class="header-actions">
        <!-- Language Selector Dropdown -->
        <div class="lang-selector-wrap" title="Change Language">
          <span class="material-symbols-outlined lang-icon">language</span>
          <select class="header-lang-select" id="nav-lang-select" onchange="changeLang(this.value)">
            ${LANGUAGES.map(l => `
              <option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>
            `).join('')}
          </select>
          <span class="material-symbols-outlined lang-arrow">arrow_drop_down</span>
        </div>

        <!-- Alerts Quick Indicator -->
        <button class="icon-btn alert-bell-btn" onclick="go('Alerts')" title="Corridor Alerts">
          <span class="material-symbols-outlined">notifications</span>
          ${state.top10Alerts.length ? `<span class="bell-dot"></span>` : ''}
        </button>

        <!-- User Authentication -->
        ${state.user ? `
          <div class="user-chip">
            <span class="material-symbols-outlined user-avatar">account_circle</span>
            <span class="user-name">${esc(state.user.name.split(' ')[0])}</span>
            <button class="logout-btn" onclick="handleLogout()" title="${t('nav.logout')}">
              <span class="material-symbols-outlined">logout</span>
            </button>
          </div>
        ` : `
          <button class="btn btn-auth-login" onclick="openAuth('login')">
            <span class="material-symbols-outlined auth-btn-icon">login</span>
            <span>${t('nav.login')}</span>
          </button>
        `}

        <!-- Mobile Menu Toggle -->
        <button class="mobile-toggle-btn" onclick="state.menu = !state.menu; render();" aria-label="Toggle Menu">
          <span class="material-symbols-outlined">${state.menu ? 'close' : 'menu'}</span>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer Overlay -->
    ${state.menu ? `
      <div class="mobile-drawer-overlay" onclick="state.menu = false; render();"></div>
      <div class="mobile-drawer">
        <div class="drawer-header">
          <div class="brand" onclick="go('Home')">
            <div class="brand-emblem"><span class="material-symbols-outlined brand-icon">hub</span></div>
            <div class="brand-text">
              <div class="brand-name">NER <span>SmartLogix</span></div>
              <div class="brand-tag">LOGISTICS INTELLIGENCE PORTAL</div>
            </div>
          </div>
          <button class="drawer-close-btn" onclick="state.menu = false; render();">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="drawer-nav">
          ${NAV_ITEMS.map(item => `
            <button class="drawer-nav-item ${state.page === item.id ? 'active' : ''}" onclick="go('${item.id}')">
              <span class="material-symbols-outlined">${item.icon}</span>
              <span>${t(item.i18nKey) || item.label}</span>
              ${item.id === 'Alerts' && state.top10Alerts.length ? `<span class="nav-badge">${state.top10Alerts.length}</span>` : ''}
            </button>
          `).join('')}
        </div>

        <div class="drawer-footer">
          <div class="drawer-lang">
            <label><span class="material-symbols-outlined">language</span> ${t('lang.select') || 'Select Language'}</label>
            <select class="field" onchange="changeLang(this.value)">
              ${LANGUAGES.map(l => `<option value="${l.code}" ${state.language === l.code ? 'selected' : ''}>${l.label}</option>`).join('')}
            </select>
          </div>

          <div class="drawer-auth">
            ${state.user ? `
              <div class="drawer-user-info">
                <span class="material-symbols-outlined">account_circle</span>
                <div>
                  <strong>${esc(state.user.name)}</strong>
                  <small>${esc(state.user.email)}</small>
                </div>
              </div>
              <button class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="handleLogout()">
                <span class="material-symbols-outlined">logout</span> ${t('nav.logout')}
              </button>
            ` : `
              <button class="btn btn-hero-primary" style="width:100%;" onclick="openAuth('login')">
                <span class="material-symbols-outlined">login</span> ${t('nav.login')} / ${t('nav.signup')}
              </button>
            `}
          </div>
        </div>
      </div>
    ` : ''}
  </header>`;
}

// Hero Section (Full-bleed 100vh on Home Page)
function heroSection() {
  return `
  <section class="hero-section" id="hero">
    <div class="hero-bg-media"></div>
    <div class="hero-gradient-overlay"></div>
    <div class="hero-noise-overlay"></div>

    <div class="hero-container">
      <div class="hero-left">
        <div class="hero-eyebrow">
          <span class="eyebrow-dot"></span>
          <span>SMART LOGISTICS · CONNECTED INFRASTRUCTURE · NORTH EAST REGION</span>
        </div>

        <h1 class="hero-heading">
          Unified Logistics Intelligence <br>
          <span class="hero-highlight">for North East India</span>
        </h1>

        <p class="hero-description">
          A dedicated digital freight and mobility corridor platform designed to solve mountain terrain logistics, enhance multimodal supply chain visibility, provide predictive AI hazard alerts, and safeguard commercial transportation across all 8 North Eastern states.
        </p>

        <div class="hero-cta-group">
          <button class="btn btn-hero-primary" onclick="go('Plan Trip')">
            <span class="material-symbols-outlined">explore</span>
            <span>Explore Platform &amp; Routes</span>
            <span class="btn-arrow-symbol">→</span>
          </button>
          <button class="btn btn-hero-secondary" onclick="scrollToSection('platform-overview')">
            <span class="material-symbols-outlined">read_more</span>
            <span>Learn More</span>
          </button>
        </div>

        <!-- Quick Corridor Metrics Strip -->
        <div class="hero-metrics-strip">
          <div class="hero-metric-box">
            <span class="metric-num">8</span>
            <span class="metric-label">NER States Connected</span>
          </div>
          <div class="metric-sep"></div>
          <div class="hero-metric-box">
            <span class="metric-num">1,500+</span>
            <span class="metric-label">Freight Facilities &amp; Amenities</span>
          </div>
          <div class="metric-sep"></div>
          <div class="hero-metric-box">
            <span class="metric-num">100+</span>
            <span class="metric-label">Monitored Corridors</span>
          </div>
          <div class="metric-sep"></div>
          <div class="hero-metric-box">
            <span class="metric-num">11</span>
            <span class="metric-label">Regional Languages</span>
          </div>
        </div>
      </div>

      <!-- Right: Floating Live Telemetry Panel -->
      <div class="hero-right">
        <div class="hero-telemetry-card">
          <div class="telemetry-head">
            <div class="telemetry-title">
              <span class="pulse-indicator"></span>
              <span>CORRIDOR TELEMETRY STATUS</span>
            </div>
            <span class="live-tag">ONLINE</span>
          </div>

          <div class="telemetry-items">
            <div class="telemetry-row">
              <div class="t-left">
                <span class="material-symbols-outlined t-icon">route</span>
                <span class="t-label">Strategic Trunk Axis</span>
              </div>
              <span class="t-val">Guwahati ↔ Shillong ↔ Silchar</span>
            </div>

            <div class="telemetry-row">
              <div class="t-left">
                <span class="material-symbols-outlined t-icon">psychology</span>
                <span class="t-label">AI Terrain-Risk Engine</span>
              </div>
              <span class="t-val t-status-good">Operational (Active)</span>
            </div>

            <div class="telemetry-row">
              <div class="t-left">
                <span class="material-symbols-outlined t-icon">notifications_active</span>
                <span class="t-label">Live Incident Feed</span>
              </div>
              <span class="t-val ${state.top10Alerts.length ? 't-status-warning' : 't-status-good'}">
                ${state.top10Alerts.length ? `${state.top10Alerts.length} Active Advisories` : '0 Critical Blockages'}
              </span>
            </div>

            <div class="telemetry-row">
              <div class="t-left">
                <span class="material-symbols-outlined t-icon">shield</span>
                <span class="t-label">Disaster &amp; SOS Network</span>
              </div>
              <span class="t-val">24/7 Helpline Integrated</span>
            </div>
          </div>

          <div class="telemetry-action">
            <button class="telemetry-btn" onclick="go('Live Network')">
              <span>View Live Network Telemetry</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll Down Prompt -->
    <div class="hero-scroll-prompt" onclick="scrollToSection('platform-overview')">
      <span class="scroll-text">SCROLL TO EXPLORE</span>
      <span class="material-symbols-outlined scroll-chevron">keyboard_arrow_down</span>
    </div>
  </section>`;
}

// Content Sections Below Hero on Home Page
function homeSections() {
  return `
  <div class="home-sections">
    <!-- SECTION 1: Platform Overview -->
    <section class="section-container" id="platform-overview">
      <div class="section-header-centered">
        <div class="section-eyebrow">NATIONAL LOGISTICS INITIATIVE</div>
        <h2 class="section-title">Built for the Complex Geographies of North East India</h2>
        <p class="section-subtitle">
          From the Brahmaputra valley to high mountain passes, NER SmartLogix unifies road transport data, terrain vulnerability ratings, freight amenities, and real-time incident response into a single, high-reliability logistics corridor platform.
        </p>
      </div>

      <div class="overview-grid">
        <div class="overview-card">
          <div class="overview-icon-wrap">
            <span class="material-symbols-outlined">terrain</span>
          </div>
          <h3>Mountain-Grade Route Optimization</h3>
          <p>
            Unlike conventional civilian navigation, our routing algorithms evaluate vehicle axle weight, road gradient thresholds, hair-pin turn radius, and heavy-duty load suitability across mountainous terrain.
          </p>
          <div class="card-footer-meta">
            <span>Specialized for heavy haulage</span>
          </div>
        </div>

        <div class="overview-card">
          <div class="overview-icon-wrap">
            <span class="material-symbols-outlined">cloud_sync</span>
          </div>
          <h3>Predictive Terrain &amp; Monsoon Risk</h3>
          <p>
            Powered by machine learning models trained on seasonal monsoon precipitation, elevation differentials, and historical landslide vulnerability records across Assam, Meghalaya, and Arunachal Pradesh.
          </p>
          <div class="card-footer-meta">
            <span>Machine Learning Powered</span>
          </div>
        </div>

        <div class="overview-card">
          <div class="overview-icon-wrap">
            <span class="material-symbols-outlined">local_shipping</span>
          </div>
          <h3>Multimodal Corridor Integration</h3>
          <p>
            Facilitates seamless multimodal coordination across National Highways (NH-27, NH-06), Inland Waterways Authority of India (IWAI) Brahmaputra riverine ports, and railway transshipment terminals.
          </p>
          <div class="card-footer-meta">
            <span>Intermodal Logistics</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: Core Platform Capabilities Grid (6 Cards) -->
    <section class="section-container bg-surface" id="capabilities">
      <div class="section-header-centered">
        <div class="section-eyebrow">ENTERPRISE CORE CAPABILITIES</div>
        <h2 class="section-title">Integrated Modules for Drivers, Fleets &amp; Authorities</h2>
        <p class="section-subtitle">
          Explore the purpose-built functional systems designed to safeguard drivers, ensure cargo integrity, and minimize transit delays across the region.
        </p>
      </div>

      <div class="capabilities-grid">
        <!-- Card 1 -->
        <div class="cap-card" onclick="go('Plan Trip')">
          <div class="cap-header">
            <div class="cap-icon-box">
              <span class="material-symbols-outlined">alt_route</span>
            </div>
            <span class="cap-tag">ROUTING</span>
          </div>
          <h3 class="cap-title">Intelligent Trip Planning</h3>
          <p class="cap-desc">
            Calculate multi-alternative routes tailored specifically to Heavy Trucks, Tankers, Refrigerated Vans, and Pickups with accurate distance, ETA, and traffic estimates.
          </p>
          <div class="cap-action">
            <span>Calculate Route</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Card 2 -->
        <div class="cap-card" onclick="go('Live Network')">
          <div class="cap-header">
            <div class="cap-icon-box">
              <span class="material-symbols-outlined">radar</span>
            </div>
            <span class="cap-tag">TELEMETRY</span>
          </div>
          <h3 class="cap-title">Live Corridor Network</h3>
          <p class="cap-desc">
            Interactive GIS map monitoring real-time GPS locations, route geometries, terrain elevations, checkpoint stations, and remaining corridor distance.
          </p>
          <div class="cap-action">
            <span>Launch Live Map</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Card 3 -->
        <div class="cap-card" onclick="go('Alerts')">
          <div class="cap-header">
            <div class="cap-icon-box" style="color:var(--orange)">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <span class="cap-tag" style="color:var(--orange);border-color:rgba(251,146,60,0.3)">ALERTS</span>
          </div>
          <h3 class="cap-title">Incident &amp; Hazard Alerts</h3>
          <p class="cap-desc">
            Real-time verified bulletins covering highway blockages, landslide clearances, flood detours, bridge weight limits, and border checkpoint status.
          </p>
          <div class="cap-action">
            <span>View Active Advisories</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Card 4 -->
        <div class="cap-card" onclick="go('Facilities')">
          <div class="cap-header">
            <div class="cap-icon-box" style="color:var(--green)">
              <span class="material-symbols-outlined">local_gas_station</span>
            </div>
            <span class="cap-tag" style="color:var(--green);border-color:rgba(52,211,153,0.3)">AMENITIES</span>
          </div>
          <h3 class="cap-title">Verified Freight Facilities</h3>
          <p class="cap-desc">
            Find geo-verified commercial diesel fuel bunks, 24/7 truck rest bays, certified weighbridges, EV charging plazas, and emergency mechanical repair hubs.
          </p>
          <div class="cap-action">
            <span>Locate Freight Amenities</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Card 5 -->
        <div class="cap-card" onclick="go('My Trip')">
          <div class="cap-header">
            <div class="cap-icon-box">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <span class="cap-tag">DISPATCH</span>
          </div>
          <h3 class="cap-title">Trip &amp; Fleet Management</h3>
          <p class="cap-desc">
            Log dispatch manifests, save evaluated routes, track multi-day cargo itineraries, and review historical performance analytics for your commercial fleet.
          </p>
          <div class="cap-action">
            <span>Manage Trips</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>

        <!-- Card 6 -->
        <div class="cap-card" onclick="go('Help & Safety')">
          <div class="cap-header">
            <div class="cap-icon-box" style="color:var(--red)">
              <span class="material-symbols-outlined">emergency</span>
            </div>
            <span class="cap-tag" style="color:var(--red);border-color:rgba(239,68,68,0.3)">SAFETY</span>
          </div>
          <h3 class="cap-title">Emergency SOS &amp; Hill Guidelines</h3>
          <p class="cap-desc">
            Instant 1-tap SOS distress broadcasts, emergency police/ambulance contacts for all 8 states, and mandatory mountain descent driving protocols.
          </p>
          <div class="cap-action">
            <span>Safety Guidelines &amp; SOS</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: Real-Time Corridor Statistics Strip -->
    <section class="section-stats-banner">
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-number" data-target="8">8</div>
          <div class="stat-title">States Integrated</div>
          <div class="stat-desc">Complete NER Coverage</div>
        </div>
        <div class="stat-divider"></div>

        <div class="stat-card">
          <div class="stat-number" data-target="1500">1,500+</div>
          <div class="stat-title">Freight Facilities &amp; Amenities</div>
          <div class="stat-desc">Fuel, rest bays, hospitals &amp; weighbridges</div>
        </div>
        <div class="stat-divider"></div>

        <div class="stat-card">
          <div class="stat-number" data-target="100">100+</div>
          <div class="stat-title">Monitored Corridors</div>
          <div class="stat-desc">Highways &amp; mountain passes</div>
        </div>
        <div class="stat-divider"></div>

        <div class="stat-card">
          <div class="stat-number" data-target="11">11</div>
          <div class="stat-title">Languages Supported</div>
          <div class="stat-desc">Regional indigenous localization</div>
        </div>
        <div class="stat-divider"></div>

        <div class="stat-card">
          <div class="stat-number">99.9%</div>
          <div class="stat-title">Uptime Reliability</div>
          <div class="stat-desc">Cloud resilient architecture</div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: Strategic Corridors of North East India -->
    <section class="section-container" id="strategic-corridors">
      <div class="section-header-centered">
        <div class="section-eyebrow">REGIONAL ARTERIES</div>
        <h2 class="section-title">Critical Economic Corridors Monitored</h2>
        <p class="section-subtitle">
          Real-time visibility over the vital arterial lifelines connecting North East India with the national logistics grid and international borders.
        </p>
      </div>

      <div class="corridors-grid">
        <div class="corridor-card">
          <div class="corridor-badge">EAST-WEST HIGHWAY CORRIDOR</div>
          <h4>NH-27: Silchar – Guwahati – Bongaigaon</h4>
          <p>The primary high-capacity freight artery linking Assam to mainland India, handling over 65% of regional container and bulk goods traffic.</p>
          <div class="corridor-tags">
            <span>Heavy Truck Ready</span>
            <span>Weighbridges Active</span>
            <span>4-Lane Expressway</span>
          </div>
        </div>

        <div class="corridor-card">
          <div class="corridor-badge">HILL TRANSIT ARTERY</div>
          <h4>NH-06: Guwahati – Shillong – Silchar – Agartala</h4>
          <p>Crucial mountain corridor connecting Meghalaya, Southern Assam, and Tripura with continuous gradient monitoring and landslide telemetry.</p>
          <div class="corridor-tags">
            <span>Terrain Alert Synced</span>
            <span>Monsoon Monitored</span>
            <span>Climbing Lanes</span>
          </div>
        </div>

        <div class="corridor-card">
          <div class="corridor-badge">FRONTIER GATEWAY</div>
          <h4>NH-13 &amp; NH-15: Trans-Arunachal Highway</h4>
          <p>Connecting strategic border logistics nodes across Arunachal Pradesh through challenging alpine passes with seasonal weather routing.</p>
          <div class="corridor-tags">
            <span>Border Trade Transit</span>
            <span>High Altitude ML Risk</span>
            <span>Cold Protection</span>
          </div>
        </div>

        <div class="corridor-card">
          <div class="corridor-badge">MULTIMODAL WATERWAY</div>
          <h4>National Waterway-2 (NW-2): Pandu Port Hub</h4>
          <p>Brahmaputra riverine cargo terminals integrating water-to-road transshipment for bulk agricultural, tea, and industrial petroleum freight.</p>
          <div class="corridor-tags">
            <span>Inland Waterway Port</span>
            <span>Intermodal Transfer</span>
            <span>Barge Logistics</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 5: High-Impact Call to Action Banner -->
    <section class="section-cta-banner">
      <div class="cta-banner-card">
        <div class="cta-glow"></div>
        <div class="cta-inner">
          <div class="cta-content">
            <span class="cta-eyebrow">START PLANNING WITH ACCURACY</span>
            <h2 class="cta-heading">Ready to Optimize Your Logistics Operations in North East India?</h2>
            <p class="cta-sub">
              Access real-time route optimization, terrain risk predictions, and verified logistics facilities in just a few clicks.
            </p>
          </div>
          <div class="cta-buttons">
            <button class="btn btn-hero-primary cta-btn-main" onclick="go('Plan Trip')">
              <span class="material-symbols-outlined">alt_route</span>
              <span>Launch Trip Planner</span>
              <span class="btn-arrow-symbol">→</span>
            </button>
            <button class="btn btn-hero-secondary cta-btn-sub" onclick="go('Live Network')">
              <span class="material-symbols-outlined">radar</span>
              <span>Inspect Live Network</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: Government/Enterprise Portal Footer -->
    ${footer()}
  </div>`;
}

// Enterprise Footer Component
function footer() {
  return `
  <footer class="site-footer">
    <div class="footer-top">
      <div class="footer-col footer-col-brand">
        <div class="brand" onclick="go('Home')">
          <div class="brand-emblem"><span class="material-symbols-outlined brand-icon">hub</span></div>
          <div class="brand-text">
            <div class="brand-name">NER <span>SmartLogix</span></div>
            <div class="brand-tag">LOGISTICS INTELLIGENCE PORTAL</div>
          </div>
        </div>
        <p class="footer-desc">
          A unified logistics intelligence and freight mobility corridor platform dedicated to North East India. Empowering logistics operators, transport authorities, and commercial drivers with real-time navigation safety and supply chain visibility.
        </p>
        <div class="footer-badges">
          <span class="gov-pill">
            <span class="gov-dot"></span>
            North Eastern Regional Corridor
          </span>
          <span class="gov-pill">Multimodal GIS Engine</span>
        </div>
      </div>

      <div class="footer-col">
        <h4 class="footer-title">Platform Navigation</h4>
        <ul class="footer-links">
          <li><a href="javascript:void(0)" onclick="go('Home')">Portal Home</a></li>
          <li><a href="javascript:void(0)" onclick="go('Plan Trip')">Plan Trip &amp; Routes</a></li>
          <li><a href="javascript:void(0)" onclick="go('Live Network')">Live Network Map</a></li>
          <li><a href="javascript:void(0)" onclick="go('Alerts')">Incident &amp; Hazard Alerts</a></li>
          <li><a href="javascript:void(0)" onclick="go('Facilities')">Freight Facilities Directory</a></li>
          <li><a href="javascript:void(0)" onclick="go('My Trip')">My Trips &amp; Fleet</a></li>
          <li><a href="javascript:void(0)" onclick="go('Help & Safety')">Safety &amp; Hill Driving</a></li>
          <li><a href="javascript:void(0)" onclick="go('Feedback')">Submit Feedback</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4 class="footer-title">Regional Coverage</h4>
        <ul class="footer-links-grid">
          <li><span>Assam</span></li>
          <li><span>Meghalaya</span></li>
          <li><span>Arunachal Pradesh</span></li>
          <li><span>Tripura</span></li>
          <li><span>Manipur</span></li>
          <li><span>Nagaland</span></li>
          <li><span>Mizoram</span></li>
          <li><span>Sikkim</span></li>
        </ul>
        <div class="footer-sub-card">
          <div class="sub-card-title">Intermodal Corridors</div>
          <div class="sub-card-text">NH-27, NH-06, NW-2 Pandu, Asian Highway 1 &amp; 2 Gateways</div>
        </div>
      </div>

      <div class="footer-col">
        <h4 class="footer-title">Emergency &amp; Support</h4>
        <div class="emergency-box">
          <div class="emergency-item">
            <span class="material-symbols-outlined e-icon">emergency</span>
            <div>
              <strong>112</strong>
              <small>National Emergency Response</small>
            </div>
          </div>
          <div class="emergency-item">
            <span class="material-symbols-outlined e-icon">crisis_alert</span>
            <div>
              <strong>1070</strong>
              <small>State Disaster Management</small>
            </div>
          </div>
          <div class="emergency-item">
            <span class="material-symbols-outlined e-icon">traffic</span>
            <div>
              <strong>1033</strong>
              <small>National Highway Emergency</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="footer-copyright">
        © 2026 NER SmartLogix Platform. All rights reserved. Built for North East Regional Logistics &amp; Trade Resilience.
      </div>
      <div class="footer-meta-links">
        <span>Privacy Policy</span>
        <span class="meta-sep">·</span>
        <span>Terms of Service</span>
        <span class="meta-sep">·</span>
        <span>Hyperlinking Policy</span>
        <span class="meta-sep">·</span>
        <span>Accessibility Statement</span>
      </div>
    </div>
  </footer>`;
}

// Toast Notification Element
function toastEl() {
  if (!state.toast.message) return '';
  const isError = state.toast.type === 'error';
  return `
  <div class="toast ${isError ? 'toast-error' : 'toast-success'}">
    <span class="material-symbols-outlined toast-icon">${isError ? 'cancel' : 'check_circle'}</span>
    <span class="toast-msg">${esc(state.toast.message)}</span>
  </div>`;
}

// Router Page Content Resolver
async function pageContent() {
  switch (state.page) {
    case 'Home': {
      return '';
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

// Helper for Smooth Scrolling to Sections
window.scrollToSection = (sectionId) => {
  const target = document.getElementById(sectionId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
};

// Main Render Function
export async function render() {
  const isHome = state.page === 'Home';
  const content = isHome ? '' : await pageContent();
  const app = document.getElementById('app');
  if (!app) return;

  if (isHome) {
    app.innerHTML =
      header() +
      `<main class="portal-main-home">` +
        heroSection() +
        homeSections() +
      `</main>` +
      toastEl() +
      renderAuthModal();
  } else {
    app.innerHTML =
      header() +
      `<main class="portal-main-inner">` +
        `<div class="inner-page-banner">
          <div class="inner-banner-container">
            <div class="inner-breadcrumb">
              <span class="crumb-link" onclick="go('Home')">Home</span>
              <span class="crumb-sep">/</span>
              <span class="crumb-current">${esc(state.page)}</span>
            </div>
            <div class="inner-banner-row">
              <div>
                <h1 class="inner-page-title">${esc(state.page)}</h1>
                <div class="inner-page-desc">NER Logistics Intelligence Portal · North East Region</div>
              </div>
              <div class="inner-badge-status">
                <span class="live-dot"></span>
                <span>SYSTEM OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>` +
        `<div class="content-container">
          <div id="page-content">${content}</div>
        </div>` +
        footer() +
      `</main>` +
      toastEl() +
      renderAuthModal();
  }

  // Bind scroll event to update header style dynamically
  bindHeaderScroll();
}

function bindHeaderScroll() {
  const headerEl = document.getElementById('site-header');
  if (!headerEl) return;

  if (state.page !== 'Home') {
    headerEl.classList.add('scrolled');
    return;
  }

  const handleScroll = () => {
    if (window.scrollY > 40) {
      headerEl.classList.add('scrolled');
    } else {
      headerEl.classList.remove('scrolled');
    }
  };

  window.removeEventListener('scroll', handleScroll);
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// Expose render globally
window.render = render;
