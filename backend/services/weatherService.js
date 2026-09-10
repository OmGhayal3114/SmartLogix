/**
 * Weather Service for NER Smart Logix
 * Fetches real current conditions & forecast from Open-Meteo API (free, open, no API key needed).
 * Implements in-memory TTL caching (1 hour) per coordinate cluster.
 */

const weatherCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function roundCoord(val) {
  return Number(Number(val).toFixed(1));
}

function getCacheKey(lat, lng) {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

/**
 * Fetch weather for a single coordinate from Open-Meteo
 */
async function fetchPointWeather(lat, lng) {
  const key = getCacheKey(lat, lng);
  const cached = weatherCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return { ...cached.data, cached: true };
  }

  const roundedLat = roundCoord(lat);
  const roundedLng = roundCoord(lng);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=2`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = await res.json();
    const current = json.current || {};
    const daily = json.daily || {};

    const data = {
      available: true,
      latitude: roundedLat,
      longitude: roundedLng,
      temperature_c: current.temperature_2m ?? null,
      relative_humidity: current.relative_humidity_2m ?? null,
      precipitation_current_mm: current.precipitation ?? 0,
      rain_current_mm: current.rain ?? 0,
      wind_speed_kmh: current.wind_speed_10m ?? 0,
      forecast_24h_precip_mm: daily.precipitation_sum?.[0] ?? 0,
      forecast_48h_precip_mm: (daily.precipitation_sum?.[0] ?? 0) + (daily.precipitation_sum?.[1] ?? 0),
      precipitation_probability_pct: daily.precipitation_probability_max?.[0] ?? 0,
      observation_time: current.time || new Date().toISOString(),
      dataSource: 'Open-Meteo Real-Time Weather & Forecast'
    };

    weatherCache.set(key, { timestamp: Date.now(), data });
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[WeatherService] Failed to fetch weather for (${roundedLat}, ${roundedLng}):`, err.message);
    return {
      available: false,
      latitude: roundedLat,
      longitude: roundedLng,
      error: err.message,
      dataSource: 'Weather data unavailable (fallback to historical estimate)'
    };
  }
}

/**
 * Fetch weather along a route sampled at multiple points (start, midpoints, end)
 */
async function getWeatherForRoutePoints(points = []) {
  if (!points || points.length === 0) {
    return [];
  }

  const sampled = [];
  if (points.length <= 4) {
    sampled.push(...points);
  } else {
    sampled.push(points[0]);
    sampled.push(points[Math.floor(points.length / 3)]);
    sampled.push(points[Math.floor((points.length * 2) / 3)]);
    sampled.push(points[points.length - 1]);
  }

  const results = await Promise.allSettled(
    sampled.map(pt => fetchPointWeather(pt.lat, pt.lng))
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : { available: false });
}

module.exports = {
  fetchPointWeather,
  getWeatherForRoutePoints
};
