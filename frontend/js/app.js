// NER SmartLogix — Application entry point

import { state, loadSession } from './state.js';
import { initI18n } from './i18n.js';
import { render } from './render.js';
import { go } from './router.js';

// Expose state globally so inline event handlers (onclick=) can access it
window.state = state;

// Check if backend is reachable, show banner if not
async function checkBackend() {
  try {
    const res = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('unhealthy');
    return true;
  } catch (e) {
    return false;
  }
}

function showOfflineBanner() {
  const existing = document.getElementById('offline-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a0a0a;border-bottom:2px solid #ef444466;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-family:system-ui;font-size:13px;color:#fca5a5">
      <span>⚠ &nbsp; Backend server is not running. Start it with: <code style="background:#0b0f1a;padding:2px 8px;border-radius:4px;color:#5eead4">cd C:\\smartlogix\\backend &amp;&amp; node server.js</code></span>
      <button onclick="location.reload()" style="background:#ef4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Retry</button>
    </div>`;
  document.body.prepend(banner);
}

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
    console.warn('[App] Backend not reachable on port 5000. Start the backend server.');
    return; // Don't try further API calls
  }

  // Load alerts for badge count in nav
  try {
    const { api } = await import('./api.js');
    const data = await api.getTop10Alerts();
    state.top10Alerts = data.alerts || [];
    await render();
  } catch (e) {
    console.warn('[App] Could not load alerts:', e.message);
  }
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
        <code style="background:#111827;color:#5eead4;padding:8px 14px;border-radius:6px;display:inline-block;margin-top:8px">cd C:\\smartlogix\\backend</code><br>
        <code style="background:#111827;color:#5eead4;padding:8px 14px;border-radius:6px;display:inline-block;margin-top:6px">node server.js</code>
      </p>
      <button onclick="location.reload()" style="margin-top:24px;padding:12px 28px;background:#5eead4;color:#0b0f1a;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px">↺ Retry</button>
    </div>`;
});
