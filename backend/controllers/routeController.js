const mapsService = require('../services/osmMaps');
const routeRiskML = require('../services/routeRiskML');

exports.calculateRoutes = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    const routes = await mapsService.getRoutes(
      origin,
      destination,
      vehicleType
    );

    let enrichedRoutes = routes;

    try {
      const risks = await Promise.all(
        routes.map(async (route) => {
          try {
            const ml = await routeRiskML.analyzeRouteRisk({
              route,
              origin,
              destination,
              vehicleType: vehicleType || 'Truck'
            });
            if (!ml || !ml.success) return null;
            return {
              risk: ml.overall.level,
              score: ml.overall.score,
              overall: ml.overall,
              factors: ml.factors,
              segments: ml.segments,
              metadata: ml.metadata || {},
              recommendation: ml.overall.recommendation,
              confidence: Number((ml.overall.confidencePct / 100).toFixed(2)),
              confidencePct: ml.overall.confidencePct,
              keyFactors: ml.overall.keyFactors,
              scoringVersion: 'ml-route-risk-v2'
            };
          } catch (e) {
            console.warn('[Route Risk] Individual route ML scoring failed:', e.message);
            return null;
          }
        })
      );

      enrichedRoutes = routes.map((route, index) => ({
        ...route,
        risk: risks[index] || null
      }));

      // If primary route has HIGH risk (score >= 45% or critical hazard factor is HIGH),
      // proactively calculate and suggest an alternate lower-risk route
      const primaryRoute = enrichedRoutes[0];
      const primaryRiskScore = primaryRoute?.risk?.score || 0;
      const primaryRiskLevel = primaryRoute?.risk?.risk || 'LOW';
      const hasHighHazard = primaryRoute?.risk?.factors && (
        primaryRoute.risk.factors.landslide?.level === 'HIGH' ||
        primaryRoute.risk.factors.landslide?.level === 'VERY HIGH' ||
        primaryRoute.risk.factors.rain?.level === 'HIGH' ||
        primaryRoute.risk.factors.rain?.level === 'VERY HIGH' ||
        primaryRoute.risk.factors.flood?.level === 'HIGH' ||
        primaryRoute.risk.factors.flood?.level === 'VERY HIGH'
      );

      const isPrimaryHighRisk = primaryRiskLevel === 'HIGH' ||
                                primaryRiskLevel === 'VERY HIGH' ||
                                primaryRiskScore >= 45 ||
                                Boolean(hasHighHazard);

      if (isPrimaryHighRisk && primaryRoute?.origin && primaryRoute?.destination) {
        const hasSafeExistingRoute = enrichedRoutes.slice(1).some(r => r.risk && r.risk.score < 45);

        if (!hasSafeExistingRoute) {
          try {
            const altPromise = mapsService.findAlternateSafetyRoute({
              origin,
              destination,
              originPoint: primaryRoute.origin,
              destinationPoint: primaryRoute.destination,
              vehicleType: vehicleType || 'Truck',
              primaryRoute,
              primaryRiskScore
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Alternate route search timeout (6s)')), 6000)
            );

            const altRoute = await Promise.race([altPromise, timeoutPromise]);

            if (altRoute) {
              altRoute.index = enrichedRoutes.length;
              enrichedRoutes.push(altRoute);
            }
          } catch (altErr) {
            console.warn('[Route Risk] Alternate safety route search failed or timed out:', altErr.message);
          }
        }
      }

      // Mark routes with safety comparison metadata
      if (enrichedRoutes.length > 0) {
        enrichedRoutes[0].isDirectRoute = true;
      }
      enrichedRoutes.forEach((route, idx) => {
        route.index = idx;
        if (idx > 0 && route.risk && route.risk.score < primaryRiskScore) {
          route.isAlternateSafetyRoute = true;
          route.isRecommendedForSafety = true;
          route.riskReductionPct = Math.max(
            0,
            Math.round(((primaryRiskScore - route.risk.score) / primaryRiskScore) * 100)
          );
        }
      });

      // Evaluate multi-criteria recommendations based on shortest distance, fastest time, and lowest risk rate
      enrichedRoutes = evaluateRouteRecommendations(enrichedRoutes);
    } catch (riskErr) {
      console.warn(
        '[Route Risk] Risk enrichment failed; returning normal routes:',
        riskErr.message
      );
      enrichedRoutes = evaluateRouteRecommendations(enrichedRoutes);
    }

    const hasAlternate = enrichedRoutes.some(r => r.isAlternateSafetyRoute || r.isRecommendedForSafety);
    const primaryRiskScore = enrichedRoutes[0]?.risk?.score || 0;
    const isPrimaryHighRisk = enrichedRoutes[0]?.risk?.risk === 'HIGH' ||
                              enrichedRoutes[0]?.risk?.risk === 'VERY HIGH' ||
                              primaryRiskScore >= 45 ||
                              Boolean(enrichedRoutes[0]?.risk?.factors && (
                                enrichedRoutes[0].risk.factors.landslide?.level === 'HIGH' ||
                                enrichedRoutes[0].risk.factors.landslide?.level === 'VERY HIGH' ||
                                enrichedRoutes[0].risk.factors.rain?.level === 'HIGH' ||
                                enrichedRoutes[0].risk.factors.rain?.level === 'VERY HIGH' ||
                                enrichedRoutes[0].risk.factors.flood?.level === 'HIGH' ||
                                enrichedRoutes[0].risk.factors.flood?.level === 'VERY HIGH'
                              ));

    return res.json({
      routes: enrichedRoutes,
      hasHighRiskAlert: isPrimaryHighRisk,
      highRiskScore: primaryRiskScore,
      alternateRouteSuggested: hasAlternate
    });
  } catch (err) {
    return res.status(502).json({
      error:
        err.message ||
        'Route calculation service is temporarily unavailable.'
    });
  }
};

exports.calculateWaypointRoute = async (req, res) => {
  try {
    const { origin, waypoint, destination, vehicleType } = req.body;
    if (!origin || !waypoint || !destination) {
      return res.status(400).json({ error: 'Origin, waypoint, and destination are required.' });
    }
    const route = await mapsService.getWaypointRoute(origin, waypoint, destination, vehicleType);
    return res.json({ route });
  } catch (err) {
    return res.status(502).json({
      error: err.message || 'Could not calculate multi-stop route.'
    });
  }
};

exports.suggestLocations = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] });
    const suggestions = await mapsService.suggest(q);
    return res.json({ suggestions });
  } catch (err) {
    return res.json({ suggestions: [] });
  }
};

exports.reverseGeocodeLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const data = await mapsService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Reverse geocoding failed.' });
  }
};

/**
 * Multi-criteria decision model comparing:
 * 1. Shortest Distance (distanceValue)
 * 2. Less Time / Fastest Duration (durationValue)
 * 3. Lowest Risk Rate (risk.score)
 * Determines recommended route with tailored reasoning and badges.
 */
function evaluateRouteRecommendations(routes) {
  if (!routes || routes.length === 0) return routes;
  if (routes.length === 1) {
    routes[0].isRecommended = true;
    routes[0].isShortest = true;
    routes[0].isFastest = true;
    routes[0].isLowestRisk = true;
    routes[0].title = 'Recommended Direct Route';
    routes[0].recommendationReason = 'Only available road corridor between origin and destination.';
    return routes;
  }

  // Extract min values across all routes
  const minDistance = Math.min(...routes.map(r => r.distanceValue || Infinity));
  const minDuration = Math.min(...routes.map(r => r.durationValue || Infinity));
  const minRisk = Math.min(...routes.map(r => (r.risk?.score ?? 50)));

  // Tag individual comparison achievements
  routes.forEach(r => {
    const dist = r.distanceValue || 0;
    const dur = r.durationValue || 0;
    const risk = r.risk?.score ?? 50;

    r.isShortest = dist <= minDistance * 1.03;
    r.isFastest = dur <= minDuration * 1.03;
    r.isLowestRisk = risk <= minRisk + 2;
  });

  // Calculate composite multi-criteria trade-off score (lower penalty is better)
  let bestRoute = null;
  let bestPenalty = Infinity;

  routes.forEach((r, idx) => {
    const distRatio = minDistance > 0 ? (r.distanceValue / minDistance) : 1;
    const durRatio = minDuration > 0 ? (r.durationValue / minDuration) : 1;
    const riskVal = r.risk?.score ?? 50;
    const riskLevel = r.risk?.risk || r.risk?.overall?.level || 'MODERATE';

    // Base weights: Safety/Risk (45%), Travel Time (35%), Distance (20%)
    let penalty = (0.45 * (riskVal / 100)) +
                  (0.35 * (durRatio - 1)) +
                  (0.20 * (distRatio - 1));

    const isHighHazard = Boolean(r.risk?.factors && (
      r.risk.factors.landslide?.level === 'HIGH' || r.risk.factors.landslide?.level === 'VERY HIGH' ||
      r.risk.factors.flood?.level === 'HIGH' || r.risk.factors.flood?.level === 'VERY HIGH' ||
      r.risk.factors.rain?.level === 'HIGH' || r.risk.factors.rain?.level === 'VERY HIGH'
    ));

    // High risk penalty: In logistics, safety is critical
    if (riskLevel === 'VERY HIGH' || riskVal >= 75) {
      penalty += 0.80;
    } else if (riskLevel === 'HIGH' || riskVal >= 50 || isHighHazard) {
      penalty += 0.40;
    } else if (riskLevel === 'LOW' || riskVal <= 25) {
      penalty -= 0.15;
    }

    // Direct route advantage if risk is low/moderate (< 45%)
    if (idx === 0 && riskVal < 45 && !isHighHazard) {
      penalty -= 0.12;
    }

    r.compositeScore = penalty;

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestRoute = r;
    }
  });

  // Assign titles and reasons
  routes.forEach((r) => {
    const isRec = (r === bestRoute);
    r.isRecommended = isRec;

    const riskVal = r.risk?.score ?? 0;
    const isDirect = r.isDirectRoute || r.index === 0;

    if (isRec) {
      if (r.isShortest && r.isFastest && r.isLowestRisk) {
        r.title = 'Recommended Route — Shortest, Fastest & Lowest Risk';
        r.recommendationReason = `Optimal choice: Shortest distance (${r.distance}), fastest travel time (${r.duration}), and lowest hazard risk (${riskVal}%).`;
      } else if (r.isShortest && r.isFastest) {
        r.title = 'Recommended Route — Fastest & Shortest Corridor';
        r.recommendationReason = `Best trade-off: Fastest time (${r.duration}) and direct distance (${r.distance}) with manageable risk (${riskVal}%).`;
      } else if (r.isLowestRisk) {
        r.title = 'Recommended Route — Safest Alternate Corridor';
        r.recommendationReason = `Selected for safety: Lowest hazard risk (${riskVal}%), avoiding severe weather/landslide hazards on direct highway.`;
      } else {
        r.title = 'Recommended Route — Best Overall Balance';
        r.recommendationReason = `Balanced performance across travel time (${r.duration}), distance (${r.distance}), and corridor risk (${riskVal}%).`;
      }
    } else {
      if (isDirect && (riskVal >= 50 || r.risk?.risk === 'HIGH' || r.risk?.risk === 'VERY HIGH')) {
        r.title = 'Direct Highway Route (High Risk Corridor)';
        r.recommendationReason = `Shortest (${r.distance}) and fastest (${r.duration}), but caution is advised due to elevated hazard score (${riskVal}%).`;
      } else if (r.isShortest && r.isFastest) {
        r.title = 'Direct Highway Route (Shortest & Fastest)';
        r.recommendationReason = `Shortest distance (${r.distance}) and fastest time (${r.duration}).`;
      } else if (r.isLowestRisk) {
        r.title = 'Alternate Safety Bypass (Lowest Risk)';
        r.recommendationReason = `Lowest corridor risk (${riskVal}%), but requires longer distance (${r.distance}).`;
      } else {
        r.title = r.summary || `Alternative Route ${r.index + 1}`;
        r.recommendationReason = `Alternative road option (${r.distance}, ${r.duration}).`;
      }
    }
  });

  return routes;
}
