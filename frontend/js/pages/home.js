// NER SmartLogix — Home page

import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function renderHomePage() {
  return `
  <section class="content home-page">

    <!-- Hero Section -->
    <div class="home-hero">
      <div class="home-hero-inner">
        <div class="home-logo-wrap">
          <span class="home-logo-icon">◉</span>
          <div>
            <div class="home-brand">NER <strong>SmartLogix</strong></div>
            <div class="home-eyebrow">${t('nav.tagline')}</div>
          </div>
        </div>
        <h1 class="home-tagline">${t('home.tagline')}</h1>
        <p class="home-desc">${t('home.description')}</p>
        <div class="home-cta-group">
          <button class="btn primary home-cta-btn" onclick="go('Plan Trip')">
            ⇄ &nbsp;${t('home.ctaPlan')}
          </button>
          <button class="btn home-cta-btn" onclick="go('Live Network')">
            ◎ &nbsp;${t('home.ctaLive')}
          </button>
        </div>
        <div class="home-ner-note">
          <span class="badge info">🗺️ ${t('home.nerNote')}</span>
        </div>
      </div>
    </div>

    <!-- Feature Cards -->
    <div class="home-features-title">
      <div class="eyebrow" style="color:var(--teal)">${t('home.featuresEyebrow')}</div>
      <h2 style="margin-top:6px">${t('home.featuresTitle')}</h2>
    </div>

    <div class="home-feature-grid">

      <div class="home-feature-card" onclick="go('Plan Trip')" role="button" tabindex="0">
        <div class="home-feature-icon" style="color:var(--teal)">⇄</div>
        <h3>${t('home.feat1Title')}</h3>
        <p>${t('home.feat1Desc')}</p>
        <span class="badge info" style="margin-top:12px">${t('home.ctaPlan')} →</span>
      </div>

      <div class="home-feature-card" onclick="go('Live Network')" role="button" tabindex="0">
        <div class="home-feature-icon" style="color:#60a5fa">◎</div>
        <h3>${t('home.feat2Title')}</h3>
        <p>${t('home.feat2Desc')}</p>
        <span class="badge info" style="margin-top:12px">${t('home.ctaLive')} →</span>
      </div>

      <div class="home-feature-card" onclick="go('Facilities')" role="button" tabindex="0">
        <div class="home-feature-icon" style="color:var(--orange)">◇</div>
        <h3>${t('home.feat3Title')}</h3>
        <p>${t('home.feat3Desc')}</p>
        <span class="badge warning" style="margin-top:12px">${t('nav.facilities')} →</span>
      </div>

      <div class="home-feature-card" onclick="go('Help & Safety')" role="button" tabindex="0">
        <div class="home-feature-icon" style="color:var(--red)">✚</div>
        <h3>${t('home.feat4Title')}</h3>
        <p>${t('home.feat4Desc')}</p>
        <span class="badge danger" style="margin-top:12px">${t('nav.help')} →</span>
      </div>

      <div class="home-feature-card" onclick="go('Alerts')" role="button" tabindex="0">
        <div class="home-feature-icon" style="color:var(--orange)">⚠</div>
        <h3>${t('home.feat5Title')}</h3>
        <p>${t('home.feat5Desc')}</p>
        <span class="badge warning" style="margin-top:12px">${t('nav.alerts')} →</span>
      </div>

    </div>

    <!-- States Strip -->
    <div class="home-states-card">
      <div class="eyebrow" style="color:var(--teal);margin-bottom:10px">${t('home.statesLabel')}</div>
      <div class="home-states-list">
        ${['Assam','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Sikkim','Tripura']
          .map(s => `<span class="badge">${s}</span>`).join('')}
      </div>
    </div>

  </section>`;
}
