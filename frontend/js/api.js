// Dynamic API base: localhost:5000 for local dev, /api for cloud deployment (Vercel)
const BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '3000')
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : '/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    opts.signal = controller.signal;
    const res = await fetch(BASE + path, opts);
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
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
  calculateWaypointRoute: (body) => request('POST', '/routes/waypoint', body),
  suggestLocations: (q) => request('GET', '/routes/suggest?q=' + encodeURIComponent(q)),
  reverseGeocode: (lat, lng) => request('GET', `/routes/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),

  // Trips
  createTrip: (body, token) => request('POST', '/trips', body, token),
  getMyTrips: (token) => request('GET', '/trips', null, token),
  deleteTrip: (id, token) => request('DELETE', '/trips/' + id, null, token),

  // Alerts
  getTop10Alerts: () => request('GET', '/alerts/top10'),
  getRouteAlerts: (origin, dest) =>
    request('GET', `/alerts/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`),

  // Facilities — POST to send actual route geometry for corridor-based search
  getFacilitiesNearRoute: (origin, dest, routeCoords = []) =>
    request('POST', '/facilities/near-route', { origin, destination: dest, routeCoords }),


  // ML
  getRouteRisk: (body) => request('POST', '/ml/route-risk', body),
  analyzeRouteRisk: (body) => request('POST', '/ml/route-risk-analysis', body),

  // Feedback
  submitFeedback: (body, token) => request('POST', '/feedback', body, token || undefined),

  // Config
};
