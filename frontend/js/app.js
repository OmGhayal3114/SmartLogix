// NER SmartLogix — Application entry point

import { state, loadSession } from './state.js';
import { initI18n } from './i18n.js';
import { render } from './render.js';
import { go } from './router.js';

// Expose state globally so inline event handlers (onclick=) can access it
window.state = state;

// Check if backend is reachable, show banner if not
async function checkBackend() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const urls = isLocal
    ? [
        `${window.location.protocol}//${window.location.hostname}:5000/api/health`,
        'http://localhost:5000/api/health',
        'http://127.0.0.1:5000/api/health'
      ]
    : ['/api/health'];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch (_) {}
  }
  return false;
}

function showOfflineBanner() {
  const existing = document.getElementById('offline-banner');
  if (existing) return;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a0a0a;border-bottom:2px solid #ef444466;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:system-ui;font-size:13px;color:#fca5a5">
      <span>⚠ &nbsp; Backend server is connecting or not reachable. ${isLocal ? 'Start it with: <code style="background:#0b0f1a;padding:2px 8px;border-radius:4px;color:#5eead4">npm run dev</code> or <code style="background:#0b0f1a;padding:2px 8px;border-radius:4px;color:#5eead4">cd backend &amp;&amp; npm start</code>' : 'Please verify cloud database connectivity.'}</span>
      <button id="offline-retry-btn" onclick="window.retryBackendConnection ? window.retryBackendConnection() : location.reload()" style="background:#ef4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Retry</button>
    </div>`;
  document.body.prepend(banner);
}

function hideOfflineBanner() {
  const existing = document.getElementById('offline-banner');
  if (existing) existing.remove();
}

async function loadBackendData() {
  try {
    const { api } = await import('./api.js');
    const data = await api.getTop10Alerts();
    state.top10Alerts = data.alerts || [];
    await render();
  } catch (e) {
    console.warn('[App] Could not load alerts:', e.message);
  }
}

let retryTimer = null;
window.retryBackendConnection = async () => {
  const retryBtn = document.getElementById('offline-retry-btn');
  if (retryBtn) retryBtn.textContent = 'Connecting...';
  const ok = await checkBackend();
  if (ok) {
    if (retryTimer) clearInterval(retryTimer);
    hideOfflineBanner();
    await loadBackendData();
  } else {
    if (retryBtn) retryBtn.textContent = 'Retry';
  }
};


// ===== THEME SYSTEM =====
// Apply saved theme immediately (before render, avoids flash)
const savedTheme = localStorage.getItem('nsl_theme') || 'dark';
if (savedTheme === 'light') document.body.classList.add('light');

window.toggleTheme = function() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('nsl_theme', isLight ? 'light' : 'dark');
  // Re-render only to update the toggle icon/label in topbar
  render();
};

async function init() {
  // Restore session from localStorage
  loadSession();

  // Load translations (works offline — served from frontend)
  await initI18n();

  // Initial render (works offline — no backend needed for UI)
  await render();

  // Check backend connectivity
  const backendOnline = await checkBackend();
  if (!backendOnline) {
    showOfflineBanner();
    console.warn('[App] Backend not reachable on port 5000. Retrying in background...');
    retryTimer = setInterval(async () => {
      const ok = await checkBackend();
      if (ok) {
        clearInterval(retryTimer);
        hideOfflineBanner();
        await loadBackendData();
      }
    }, 3000);
    return;
  }

  hideOfflineBanner();
  await loadBackendData();

  // Keep the NER alert panel synchronized with the backend's five-minute feed.
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const { api } = await import('./api.js');
      const data = await api.getTop10Alerts();
      state.top10Alerts = data.alerts || [];
      state.alertsLastUpdated = data.lastUpdated;
      if (state.page === 'Alerts') await render();
    } catch (e) {
      console.warn('[App] Alert refresh failed:', e.message);
    }
  }, 5 * 60 * 1000);
}

init().catch(err => {
  console.error('[App] Init failed:', err);
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;background:#0b0f1a;color:#e8edf5;font-family:system-ui;padding:20px;text-align:center">
      <div style="font-size:48px;color:#5eead4;margin-bottom:20px">◉</div>
      <h2 style="color:#e8edf5">NER SmartLogix</h2>
      <p style="color:#64748b;margin-top:12px;max-width:420px;line-height:1.6">
        The app could not start. This usually means the backend server is not running.<br><br>
        Open a terminal and run:<br>
        <code style="background:#111827;color:#5eead4;padding:8px 14px;border-radius:6px;display:inline-block;margin-top:8px">npm run dev</code>
      </p>
      <button onclick="location.reload()" style="margin-top:24px;padding:12px 28px;background:#5eead4;color:#0b0f1a;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px">↺ Retry</button>
    </div>`;
});
