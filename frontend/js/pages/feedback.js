// NER SmartLogix — Feedback page

import { state } from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

// Module-level state (not in global state to avoid re-render loops)
let _text = '';
let _category = 'general';
let _location = '';
let _submitting = false;

export function renderFeedbackPage() {
  return `
  <section class="content">

    <!-- Hero -->
    <div class="hero">
      <div class="hero-eyebrow">Community Signal & Crowdsourcing</div>
      <h1 class="hero-title">${t('feedback.title')}</h1>
      <p class="hero-sub">${t('feedback.subtitle')}</p>
      <div class="hero-actions">
        <span class="badge success">● Open to All Drivers</span>
        <span class="badge info">Real-Time Review</span>
        ${state.user ? `<span class="badge">Verified: ${esc(state.user.name)}</span>` : `<span class="badge">Anonymous Mode</span>`}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card" style="--stat-color:var(--teal)">
        <div class="stat-icon">↗</div>
        <div class="stat-value">5</div>
        <div class="stat-label">Report Categories</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--orange)">
        <div class="stat-icon">🗺️</div>
        <div class="stat-value">8 States</div>
        <div class="stat-label">NER Coverage</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green)">
        <div class="stat-icon">⚡</div>
        <div class="stat-value">Instant</div>
        <div class="stat-label">Database Sync</div>
      </div>
    </div>

    <div class="content-body">
      <div class="grid two">

        <div class="card form-card">
          <div class="eyebrow" style="color:var(--teal)">Submit Field Report</div>

          <div class="field">
            <label>${t('feedback.category')}</label>
            <select oninput="_fbCategory=this.value">
              <option value="route_issue">${t('feedback.categories.route_issue')}</option>
              <option value="facility_issue">${t('feedback.categories.facility_issue')}</option>
              <option value="alert_issue">${t('feedback.categories.alert_issue')}</option>
              <option value="general" selected>${t('feedback.categories.general')}</option>
              <option value="other">${t('feedback.categories.other')}</option>
            </select>
          </div>

          <div class="field">
            <label>${t('feedback.location')}</label>
            <input type="text" placeholder="e.g. NH27 near Jorabat, Kamrup" oninput="_fbLocation=this.value">
          </div>

          <div class="field">
            <label>Field Observations & Road Intelligence</label>
            <textarea rows="6" placeholder="${t('feedback.placeholder')}"
              oninput="_fbText=this.value">${esc(_text)}</textarea>
          </div>

          <button class="btn primary" style="width:100%;padding:14px;font-weight:700"
            onclick="submitFeedbackForm()" ${_submitting ? 'disabled' : ''}>
            ${_submitting ? `<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> ${t('feedback.submitting')}` : `↗ &nbsp;${t('feedback.submit')}`}
          </button>
        </div>

        <div class="card">
          <div class="eyebrow" style="color:var(--teal)">Why submit ground feedback?</div>
          <p class="desc" style="margin-top:12px;line-height:1.7">
            Your real-time reports empower logistics drivers, fleet operators, and emergency services across Northeast India with immediate, verified ground truth.
          </p>

          <div class="divider"></div>

          <div class="eyebrow" style="margin-bottom:12px">Reporting Guidelines</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${[
              '📍 Specific highway kilometer markers or landmarks',
              '🕐 Exact timestamp when disruption was encountered',
              '🚛 Commercial vehicle class impacted (tonnage / height)',
              '🌧 Road surface status: mudslides, waterlogging, fissures',
              '📸 Alternate diversions or local detours noticed'
            ].map(c => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#060e1c;border:1px solid #1e3a5f25;border-radius:8px;font-size:12px">
              <span style="color:var(--teal)">✓</span>
              <span>${c}</span>
            </div>`).join('')}
          </div>

          <div class="divider"></div>

          ${state.user
            ? `<div style="font-size:12px;color:var(--teal);display:flex;align-items:center;gap:6px"><span style="width:6px;height:6px;border-radius:50%;background:var(--teal);display:inline-block"></span> Submitting as authenticated driver: <b>${esc(state.user.name)}</b></div>`
            : `<div style="font-size:12px;color:var(--muted)">Submitting anonymously. <button class="link" onclick="openAuth('login')">Sign in</button> to link reports to your profile.</div>`
          }
        </div>

      </div>
    </div>
  </section>`;
}

// Use window vars so inline oninput can write to them without module scoping issues
window._fbText = '';
window._fbCategory = 'general';
window._fbLocation = '';

window.submitFeedbackForm = async () => {
  const { notify } = await import('../render.js');
  const text = window._fbText || _text;
  const category = window._fbCategory || _category;
  const location = window._fbLocation || _location;

  if (!text.trim()) {
    notify('Please enter your feedback before submitting.', 'error');
    return;
  }
  _submitting = true;
  window.render();
  try {
    await api.submitFeedback({
      message: text.trim(),
      category,
      location: location.trim()
    }, state.token || undefined);

    // Reset
    _text = '';
    _category = 'general';
    _location = '';
    window._fbText = '';
    window._fbCategory = 'general';
    window._fbLocation = '';

    notify(t('feedback.success'), 'success');
  } catch (err) {
    notify(err.message || t('feedback.error'), 'error');
  }
  _submitting = false;
  window.render();
};
