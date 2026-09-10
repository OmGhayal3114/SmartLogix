/**
 * ML Route Risk Prediction Service — NER Smart Logix
 * Integrates real Open-Meteo weather data, IMD historical rainfall normals,
 * GSI landslide susceptibility zonation, terrain elevation profiles,
 * and active incident reports for route-specific multi-factor risk estimation.
 */

const mongoose = require('mongoose');
const { getWeatherForRoutePoints, fetchPointWeather } = require('./weatherService');
const {
  getMonthlyRainfallNorm,
  checkLandslideVulnerability,
  checkFloodVulnerability,
  classifyTerrain,
  getHistoricalTrafficPattern,
  resolveState
} = require('./nerHistoricalData');
const Alert = require('../models/Alert');

// Configurable Risk Level Thresholds
const RISK_THRESHOLDS = {
  LOW_MAX: 25,
  MODERATE_MAX: 50,
  HIGH_MAX: 75,
  VERY_HIGH_MAX: 100
};

function getRiskLevel(score) {
  const s = Math.round(score);
  if (s <= RISK_THRESHOLDS.LOW_MAX) return 'LOW';
  if (s <= RISK_THRESHOLDS.MODERATE_MAX) return 'MODERATE';
  if (s <= RISK_THRESHOLDS.HIGH_MAX) return 'HIGH';
  return 'VERY HIGH';
}

function getRiskBadgeColor(level) {
  switch (level) {
    case 'LOW': return '#10b981'; // green
    case 'MODERATE': return '#f59e0b'; // amber/yellow
    case 'HIGH': return '#f97316'; // orange
    case 'VERY HIGH': return '#ef4444'; // red
    default: return '#64748b';
  }
}

// Distance helper
function degToRad(d) { return (d * Math.PI) / 180; }
function haversineKm(a, b) {
  const R = 6371;
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(a.lat)) * Math.cos(degToRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Slice route coordinates into N balanced geographic segments
function divideRouteIntoSegments(coords = [], numSegments = 4) {
  if (!coords || coords.length < 2) return [];
  const total = coords.length;
  const actualSegments = Math.min(Math.max(numSegments, 3), 6);
  const step = (total - 1) / actualSegments;
  const segments = [];

  for (let i = 0; i < actualSegments; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.min(total - 1, Math.floor((i + 1) * step));
    const segmentCoords = coords.slice(startIdx, endIdx + 1);

    // Midpoint
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    const midCoord = coords[midIdx];

    segments.push({
      segmentIndex: i,
      startCoord: { lng: coords[startIdx][0], lat: coords[startIdx][1] },
      endCoord: { lng: coords[endIdx][0], lat: coords[endIdx][1] },
      midCoord: { lng: midCoord[0], lat: midCoord[1] },
      coordinates: segmentCoords
    });
  }

  return segments;
}

/**
 * Core ML Route Risk Analysis Engine
 */
async function analyzeRouteRisk({ route, origin, destination, vehicleType = 'Truck', departureTime }) {
  const startTime = Date.now();
  const dateObj = departureTime ? new Date(departureTime) : new Date();
  const hour = dateObj.getHours();
  const dayOfWeek = dateObj.getDay();
  const month = dateObj.getMonth();

  // Extract coordinates from route geometry: OSM/GeoJSON [lng, lat]
  const rawCoords = route?.geometry?.coordinates || [];
  const coords = Array.isArray(rawCoords) && rawCoords.length >= 2
    ? rawCoords
    : (route?.coordinates || []);

  if (coords.length < 2) {
    return {
      success: false,
      error: 'Insufficient route geometry coordinates for segment analysis.',
      dataQuality: 'INSUFFICIENT_DATA'
    };
  }

  // 1. Divide route into 4 to 5 corridor segments
  const segments = divideRouteIntoSegments(coords, coords.length > 50 ? 5 : 4);

  // 2. Fetch real weather for segment midpoints via Open-Meteo
  const midPoints = segments.map(s => s.midCoord);
  const weatherResults = await Promise.allSettled(
    midPoints.map(pt => fetchPointWeather(pt.lat, pt.lng))
  );

  // 3. Load active DB alerts near the corridor if connected
  let activeAlerts = [];
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      activeAlerts = await Alert.find({ status: 'active' }).limit(50).lean();
    } catch (err) {
      console.warn('[ML Engine] Alert DB query skipped:', err.message);
    }
  }

  // Vehicle exposure multiplier
  const vehicleMultipliers = {
    'Truck': 1.0,
    'Medium Truck': 1.0,
    'Heavy Truck': 1.15,
    'Tanker Truck': 1.25,
    'Tanker': 1.25,
    'Refrigerated Truck': 1.10,
    'Mini Truck': 0.95,
    'Pickup Truck': 0.95,
    'Pickup': 0.95,
    'Light Commercial Vehicle': 0.95,
    'Container Truck': 1.15,
    'Multi-Axle Truck': 1.20,
    'Cargo Van': 0.90
  };
  const vFactor = vehicleMultipliers[vehicleType] || 1.0;

  // Process each segment
  const scoredSegments = [];
  let weatherAvailableCount = 0;

  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx];
    const pt = seg.midCoord;
    const wRes = weatherResults[idx]?.status === 'fulfilled' ? weatherResults[idx].value : { available: false };
    if (wRes.available) weatherAvailableCount++;

    // Historical references
    const histRain = getMonthlyRainfallNorm(pt.lat, pt.lng, month);
    const terrain = classifyTerrain(pt.lat, pt.lng);
    const landslide = checkLandslideVulnerability(pt.lat, pt.lng);
    const flood = checkFloodVulnerability(pt.lat, pt.lng);
    const trafficPattern = getHistoricalTrafficPattern(hour, dayOfWeek);

    // Weather metrics (real or fallback)
    const precipCurr = wRes.precipitation_current_mm || 0;
    const precip24h = wRes.forecast_24h_precip_mm || 0;
    const precipProb = wRes.precipitation_probability_pct || (histRain.isMonsoonMonth ? 55 : 15);
    const tempC = wRes.temperature_c ?? 24;
    const humidity = wRes.relative_humidity ?? 75;

    // Active alerts near this segment (< 25km)
    const segmentAlerts = activeAlerts.filter(a => {
      if (a.coordinates && a.coordinates.lat && a.coordinates.lng) {
        return haversineKm(pt, a.coordinates) <= 25;
      }
      const txt = (a.location + ' ' + (a.description || '')).toLowerCase();
      return txt.includes(histRain.state.toLowerCase());
    });

    const hasLandslideAlert = segmentAlerts.some(a => a.alertType === 'Landslide');
    const hasFloodAlert = segmentAlerts.some(a => a.alertType === 'Flood');
    const hasClosureAlert = segmentAlerts.some(a => ['Road Closure', 'Road Blockage'].includes(a.alertType));

    // --- FEATURE SCORING ENGINE ---

    // 1. Heavy Rain Risk (0-100%)
    const expectedDaily = Math.max(histRain.dailyExpectedMm, 1.0);
    const rainIntensityRatio = (precip24h + (precipCurr * 4)) / expectedDaily;
    let rainRiskScore = (precipProb * 0.45) + (Math.min(precip24h, 50) / 50 * 35) + (Math.min(rainIntensityRatio, 3.0) / 3.0 * 20);
    if (precipCurr > 5) rainRiskScore += 15;
    rainRiskScore = Math.min(100, Math.max(5, Math.round(rainRiskScore)));

    // 2. Landslide Risk (0-100%)
    const rainSaturationFactor = Math.min(1.0, (precip24h + (precipCurr * 6)) / 35);
    let landslideScore = (landslide.weight * 38) +
                         (terrain.slopeFactor * 26) +
                         (rainSaturationFactor * 26);
    if (hasLandslideAlert) landslideScore += 20;
    if (terrain.code === 'plains') landslideScore = Math.min(landslideScore, 18);
    landslideScore = Math.min(100, Math.max(4, Math.round(landslideScore * (vFactor >= 1.15 ? 1.08 : 1.0))));

    // 3. Flood Risk (0-100%)
    const isLowLying = terrain.code === 'plains' || terrain.baseElevation < 250;
    let floodScore = (flood.weight * 42) +
                     (rainSaturationFactor * 32) +
                     (isLowLying ? 20 : 5);
    if (hasFloodAlert) floodScore += 20;
    if (terrain.code === 'mountains' && !flood.zone) floodScore = Math.min(floodScore, 20);
    floodScore = Math.min(100, Math.max(5, Math.round(floodScore)));

    // 4. Traffic Risk (0-100%)
    let trafficScore = trafficPattern.congestionScore * 0.75;
    if (idx === 0 || idx === segments.length - 1) trafficScore += 12;
    if (hasClosureAlert) trafficScore += 25;
    if (vFactor > 1.0) trafficScore += 6;
    trafficScore = Math.min(100, Math.max(8, Math.round(trafficScore)));

    // Segment composite overall risk
    const maxHazard = Math.max(rainRiskScore, landslideScore, floodScore);
    const segmentComposite = Math.min(100, Math.round((maxHazard * 0.70) + (trafficScore * 0.20) + (Math.min(rainRiskScore, landslideScore) * 0.10)));
    const segLevel = getRiskLevel(segmentComposite);

    // Segment primary reason
    let primaryHazardType = 'Weather';
    let primaryExplanation = 'Normal conditions expected along this segment.';
    if (landslideScore >= 50 && landslideScore >= floodScore && landslideScore >= rainRiskScore) {
      primaryHazardType = 'Landslide';
      primaryExplanation = landslide.corridor
        ? `Elevated slope instability in ${landslide.corridor} under current rainfall.`
        : 'Steep hill corridor with historical landslide vulnerability.';
    } else if (floodScore >= 50 && floodScore >= rainRiskScore) {
      primaryHazardType = 'Flood';
      primaryExplanation = flood.zone
        ? `Low-lying floodplain in ${flood.zone} vulnerable to waterlogging.`
        : 'Riverine basin with potential runoff accumulation.';
    } else if (rainRiskScore >= 50) {
      primaryHazardType = 'Heavy Rain';
      primaryExplanation = `Forecast indicates ${precip24h.toFixed(1)}mm rainfall (${precipProb}% probability).`;
    } else if (trafficScore >= 60) {
      primaryHazardType = 'Traffic';
      primaryExplanation = `${trafficPattern.trafficPeriod} congestion pattern typical for this corridor.`;
    }

    scoredSegments.push({
      segmentIndex: idx,
      name: `Segment ${idx + 1}`,
      midCoord: pt,
      coordinates: seg.coordinates,
      terrain: terrain.type,
      state: histRain.state,
      riskLevel: segLevel,
      riskScore: segmentComposite,
      color: getRiskBadgeColor(segLevel),
      factors: {
        rain: { score: rainRiskScore, level: getRiskLevel(rainRiskScore) },
        landslide: { score: landslideScore, level: getRiskLevel(landslideScore) },
        flood: { score: floodScore, level: getRiskLevel(floodScore) },
        traffic: { score: trafficScore, level: getRiskLevel(trafficScore) }
      },
      currentConditions: {
        temperature: tempC !== null ? `${tempC}°C` : 'N/A',
        precipitation_mm: precipCurr,
        forecast_24h_mm: precip24h,
        precipitation_probability: precipProb,
        humidity: `${humidity}%`,
        weatherDataSource: wRes.dataSource || 'Open-Meteo'
      },
      historicalContext: {
        state: histRain.state,
        monthlyRainfallNormMm: histRain.monthlyNormalMm,
        isMonsoonMonth: histRain.isMonsoonMonth,
        terrain: terrain.type,
        landslideCorridor: landslide.corridor || 'No major corridor recorded',
        floodZone: flood.zone || 'None recorded'
      },
      primaryHazardType,
      explanation: primaryExplanation,
      activeAlertsCount: segmentAlerts.length,
      timestamp: new Date().toISOString()
    });
  }

  // Aggregate overall route risk
  const avgRain = Math.round(scoredSegments.reduce((a, b) => a + b.factors.rain.score, 0) / scoredSegments.length);
  const maxLandslide = Math.max(...scoredSegments.map(s => s.factors.landslide.score));
  const maxFlood = Math.max(...scoredSegments.map(s => s.factors.flood.score));
  const avgTraffic = Math.round(scoredSegments.reduce((a, b) => a + b.factors.traffic.score, 0) / scoredSegments.length);

  // Overall route score prioritizes peak severe hazards
  const overallScore = Math.min(100, Math.round(
    (maxLandslide * 0.32) +
    (maxFlood * 0.28) +
    (avgRain * 0.22) +
    (avgTraffic * 0.18)
  ));
  const overallLevel = getRiskLevel(overallScore);

  // Compile detailed, plain-language explanations
  const rainExplanation = avgRain >= 50
    ? 'Current and forecast precipitation is significantly elevated along the corridor.'
    : avgRain >= 26
    ? 'Moderate rain forecast along sections of the route; roads may be wet and slick.'
    : 'Clear or low-precipitation conditions forecast along the route.';

  const landslideExplanation = maxLandslide >= 50
    ? 'Steep terrain combined with moisture saturation increases landslide vulnerability on hill passes.'
    : maxLandslide >= 26
    ? 'Moderate slope risk on hill sections. Drive cautiously around cuttings.'
    : 'Low terrain slope vulnerability detected on this route.';

  const floodExplanation = maxFlood >= 50
    ? 'Route traverses known low-lying floodplains with potential waterlogging or river runoff.'
    : maxFlood >= 26
    ? 'Moderate drainage risk detected in low-elevation river crossings.'
    : 'No major flood-prone basins identified along this alignment.';

  const trafficExplanation = avgTraffic >= 50
    ? 'Elevated congestion anticipated based on scheduled travel hour and corridor patterns.'
    : 'Traffic flowing smoothly according to historical time-of-day models.';

  // Main safety summary
  const keyFactors = [];
  if (avgRain >= 40) keyFactors.push('Rainfall forecast along route');
  if (maxLandslide >= 45) keyFactors.push('Hill slope & landslide vulnerability');
  if (maxFlood >= 45) keyFactors.push('Floodplain / waterlogging risk');
  if (avgTraffic >= 50) keyFactors.push('Peak-hour traffic congestion');
  if (keyFactors.length === 0) keyFactors.push('Generally favorable travel conditions');

  let recommendation = 'No critical environmental hazards detected. Standard highway precautions apply.';
  if (overallLevel === 'VERY HIGH') {
    recommendation = 'Extreme caution advised. Verify IMD & State Disaster Management warnings before departure.';
  } else if (overallLevel === 'HIGH') {
    recommendation = 'Elevated hazards detected on certain segments. Check live road advisories and daylight travel.';
  } else if (overallLevel === 'MODERATE') {
    recommendation = 'Usable with regular caution. Monitor weather updates and maintain safe speeds on curves.';
  }

  // Real confidence calculation based on data completeness
  const weatherCoveragePct = Math.round((weatherAvailableCount / segments.length) * 100);
  const confidencePct = Math.round((weatherCoveragePct * 0.45) + 50);

  return {
    success: true,
    routeSummary: route.summary || `${origin} → ${destination}`,
    vehicleType,
    overall: {
      score: overallScore,
      level: overallLevel,
      color: getRiskBadgeColor(overallLevel),
      confidencePct,
      recommendation,
      keyFactors,
      statusLabel: 'PROTOTYPE — Estimated Route Risk'
    },
    factors: {
      rain: {
        score: avgRain,
        level: getRiskLevel(avgRain),
        explanation: rainExplanation,
        icon: '🌧️',
        dataSource: 'Open-Meteo Real-Time Weather & Forecast'
      },
      landslide: {
        score: maxLandslide,
        level: getRiskLevel(maxLandslide),
        explanation: landslideExplanation,
        icon: '🏔️',
        dataSource: 'GSI Landslide Hazard Zonation + IMD Saturation'
      },
      flood: {
        score: maxFlood,
        level: getRiskLevel(maxFlood),
        explanation: floodExplanation,
        icon: '🌊',
        dataSource: 'Brahmaputra/Barak Basin Climatology + Elevation'
      },
      traffic: {
        score: avgTraffic,
        level: getRiskLevel(avgTraffic),
        explanation: trafficExplanation,
        icon: '🚗',
        dataSource: 'Estimated Traffic Risk (no live traffic feed)'
      }
    },
    segments: scoredSegments,
    metadata: {
      segmentCount: scoredSegments.length,
      weatherLiveCoverage: `${weatherAvailableCount}/${segments.length} points`,
      calculationDurationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      disclaimer: 'Decision-support prototype. Estimates do not replace official State Disaster Management Authority or Traffic Police directives.'
    }
  };
}

module.exports = {
  analyzeRouteRisk,
  getRiskLevel,
  getRiskBadgeColor,
  RISK_THRESHOLDS
};
