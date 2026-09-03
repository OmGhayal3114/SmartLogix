// NER SmartLogix — Backend API client

const BASE = 'http://localhost:5000/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  signup: (body) => request('POST', '/auth/signup', body),
  login: (body) => request('POST', '/auth/login', body),
  getMe: (token) => request('GET', '/auth/me', null, token),
  logout: (token) => request('POST', '/auth/logout', null, token),
  updateLanguage: (lang, token) => request('PATCH', '/auth/language', { language: lang }, token),

  // Routes
  calculateRoutes: (body) => request('POST', '/routes', body),

  // Trips
  createTrip: (body, token) => request('POST', '/trips', body, token),
  getMyTrips: (token) => request('GET', '/trips', null, token),
  deleteTrip: (id, token) => request('DELETE', '/trips/' + id, null, token),

  // Alerts
  getTop10Alerts: () => request('GET', '/alerts/top10'),
  getRouteAlerts: (origin, dest) =>
    request('GET', `/alerts/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`),

  // Facilities
  getFacilitiesNearRoute: (origin, dest) =>
    request('GET', `/facilities/near-route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`),

  // ML
  getRouteRisk: (body) => request('POST', '/ml/route-risk', body),

  // Feedback
  submitFeedback: (body, token) => request('POST', '/feedback', body, token || undefined),

  // Config
  getMapsKey: () => request('GET', '/config/maps-key')
};
