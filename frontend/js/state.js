// NER SmartLogix — Centralized Application State

export const state = {
  // Navigation
  page: 'Plan Trip',
  menu: false,

  // Auth
  user: null,   // { _id, name, email, phone, preferredLanguage }
  token: null,

  // Language
  language: 'en',

  // Trip planning
  vehicleType: 'Heavy Truck',
  origin: '',
  destination: '',

  // Route results
  routeReady: false,
  routes: [],
  selectedRoute: null,

  // Live Network
  mlRisk: null,
  routeAlerts: [],
  facilities: [],

  // Alerts page
  top10Alerts: [],
  alertsLastUpdated: null,
  selectedAlert: null,

  // My Trips
  myTrips: [],
  selectedTrip: null,

  // Loading flags
  loadingMap: false,
  loadingRoutes: false,
  loadingFacilities: false,
  loadingRisk: false,
  loadingAlerts: false,
  loadingTrips: false,

  // Auth modal
  showAuth: false,
  authMode: 'login',
  authLoading: false,

  // Toast
  toast: { message: '', type: 'success' },

  // Maps
  googleMapsKey: null
};

export function loadSession() {
  const token = localStorage.getItem('nsl_token');
  const user = localStorage.getItem('nsl_user');
  const lang = localStorage.getItem('nsl_lang');
  if (token) state.token = token;
  if (user) { try { state.user = JSON.parse(user); } catch (e) {} }
  if (lang) state.language = lang;
}

export function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('nsl_token', token);
  localStorage.setItem('nsl_user', JSON.stringify(user));
}

export function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('nsl_token');
  localStorage.removeItem('nsl_user');
}

export function saveLang(lang) {
  state.language = lang;
  localStorage.setItem('nsl_lang', lang);
}
