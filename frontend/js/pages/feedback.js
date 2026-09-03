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
    <div class="section-head">
      <div>
        <div class="eyebrow" style="color:var(--teal)">Community signal</div>
        <h2>${t('feedback.title')}</h2>
        <p class="desc">${t('feedback.subtitle')}</p>
      </div>
    </div>

    <div class="grid two">

      <div class="card">

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
          <input type="text" placeholder="e.g. Guwahati-Shillong Highway" oninput="_fbLocation=this.value">
        </div>

        <div class="field">
          <label>Your Feedback</label>
          <textarea rows="7" placeholder="${t('feedback.placeholder')}"
            oninput="_fbText=this.value">${esc(_text)}</textarea>
        </div>

        <button class="btn primary" style="width:100%;margin-top:8px"
          onclick="submitFeedbackForm()" ${_submitting ? 'disabled' : ''}>
          ${_submitting ? t('feedback.submitting') : t('feedback.submit')}
        </button>

      </div>

      <div class="card">
        <div class="eyebrow" style="color:var(--teal)">Why share feedback?</div>
        <p class="desc" style="margin-top:12px;line-height:1.8">
          Your feedback helps improve route intelligence, alert accuracy, and logistics support for the entire NER region.
        </p>
        <div style="margin-top:16px">
          ${['📍 Include specific location details',
             '🕐 Mention date and time if relevant',
             '🚛 Describe the vehicle type affected',
             '📸 Describe road conditions clearly',
             '🌧 Note weather conditions if relevant'
            ].map(c => `<div style="padding:6px 0;font-size:13px">${c}</div>`).join('')}
        </div>
        ${state.user
          ? `<div style="margin-top:20px;font-size:12px;color:var(--teal)">◉ Submitting as: ${esc(state.user.name)}</div>`
          : `<div style="margin-top:20px;font-size:12px;color:var(--muted)">Submitting anonymously. <button class="link" onclick="openAuth('login')">Login</button> to attach your account.</div>`
        }
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
