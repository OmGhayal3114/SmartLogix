// NER SmartLogix — Router

import { state } from './state.js';

export function go(page) {
  // Auth guard for My Trip
  if (page === 'My Trip' && !state.user) {
    window.openAuth('login');
    import('./render.js').then(m => m.notify('Please login to view your trips.', 'error'));
    return;
  }
  state.page = page;
  state.menu = false;
  window.render();

  // Trigger page-specific data loading
  if (page === 'My Trip' && state.user) {
    import('./pages/mytrip.js').then(m => m.loadMyTrips());
  }
  if (page === 'Alerts') {
    import('./pages/alerts.js').then(m => m.loadTop10Alerts());
  }
  if (page === 'Live Network') {
    import('./pages/live.js').then(m => m.initLiveNetwork());
  }
  if (page === 'Facilities') {
    import('./pages/facilities.js').then(m => m.loadFacilitiesPage());
  }
}

window.go = go;

export function changeLang(lang) {
  import('./state.js').then(({ saveLang }) => saveLang(lang));
  import('./i18n.js').then(async ({ loadLocale }) => {
    await loadLocale(lang);
    window.render();
    // Save to backend if logged in
    if (state.token) {
      import('./api.js').then(({ api }) => {
        api.updateLanguage(lang, state.token).catch(() => {});
      });
    }
  });
}

window.changeLang = changeLang;
