// NER SmartLogix — Auth modal

import { state, saveSession, clearSession } from './state.js';
import { api } from './api.js';
import { t } from './i18n.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function renderAuthModal() {
  if (!state.showAuth) return '';
  const isLogin = state.authMode === 'login';

  return `
  <div class="modal" onclick="if(event.target===this)closeAuth()">
    <div class="modal-box" style="max-width:420px">

      <div class="row">
        <div>
          <div class="eyebrow" style="color:var(--teal)">◉ NER SmartLogix</div>
          <h2 style="margin-top:7px">${isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}</h2>
        </div>
        <button class="link" onclick="closeAuth()">✕</button>
      </div>

      ${state.authLoading
        ? `<div style="text-align:center;padding:40px;color:var(--teal)">${isLogin ? t('auth.loggingIn') : t('auth.signingUp')}</div>`
        : `<form id="auth-form" onsubmit="handleAuthSubmit(event)" style="margin-top:20px">

          ${!isLogin ? `<div class="field">
            <label>${t('auth.name')}</label>
            <input type="text" name="name" required placeholder="${t('auth.name')}">
          </div>` : ''}

          <div class="field">
            <label>${t('auth.email')}</label>
            <input type="email" name="email" required placeholder="${t('auth.email')}">
          </div>

          <div class="field">
            <label>${t('auth.password')}</label>
            <input type="password" name="password" required placeholder="${t('auth.password')}" minlength="6">
          </div>

          ${!isLogin ? `<div class="field">
            <label>${t('auth.phone')}</label>
            <input type="tel" name="phone" placeholder="${t('auth.phone')}">
          </div>` : ''}

          <button type="submit" class="btn primary" style="width:100%;margin-top:10px">
            ${isLogin ? t('auth.loginBtn') : t('auth.signupBtn')}
          </button>

          <button type="button" class="link" style="margin-top:14px;display:block;text-align:center;width:100%" onclick="toggleAuthMode()">
            ${isLogin ? t('auth.switchToSignup') : t('auth.switchToLogin')}
          </button>

        </form>`
      }
    </div>
  </div>`;
}

// Global handlers
window.closeAuth = () => { state.showAuth = false; window.render(); };
window.openAuth = (mode = 'login') => { state.showAuth = true; state.authMode = mode; window.render(); };
window.toggleAuthMode = () => { state.authMode = state.authMode === 'login' ? 'signup' : 'login'; window.render(); };

window.handleAuthSubmit = async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  state.authLoading = true;
  window.render();

  try {
    let result;
    if (state.authMode === 'login') {
      result = await api.login({ email: fd.get('email'), password: fd.get('password') });
    } else {
      result = await api.signup({
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
        phone: fd.get('phone') || ''
      });
    }
    saveSession(result.token, result.user);
    state.showAuth = false;
    state.authLoading = false;

    // Save language preference if set
    if (result.user.preferredLanguage && result.user.preferredLanguage !== state.language) {
      state.language = result.user.preferredLanguage;
      localStorage.setItem('nsl_lang', state.language);
    }

    import('./render.js').then(m => m.notify(`Welcome${state.authMode === 'login' ? ' back' : ''}, ${result.user.name}!`, 'success'));
    window.render();
  } catch (err) {
    state.authLoading = false;
    import('./render.js').then(m => m.notify(err.message || t('common.error'), 'error'));
    window.render();
  }
};

window.handleLogout = async () => {
  try { if (state.token) await api.logout(state.token); } catch (e) {}
  clearSession();
  state.page = 'Plan Trip';
  state.myTrips = [];
  state.selectedTrip = null;
  import('./render.js').then(m => m.notify('Logged out successfully.', 'success'));
  window.render();
};
