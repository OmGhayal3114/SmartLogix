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

      if (enrichedRoutes.length > 1) {
        enrichedRoutes = enrichedRoutes
          .map((route, originalIndex) => ({ route, originalIndex }))
          .sort((a, b) => {
            const aScore = Number.isFinite(a.route.risk?.score)
              ? a.route.risk.score
              : Infinity;
            const bScore = Number.isFinite(b.route.risk?.score)
              ? b.route.risk.score
              : Infinity;

            if (aScore !== bScore) return aScore - bScore;
            return a.originalIndex - b.originalIndex;
          })
          .map(({ route }, index) => ({
            ...route,
            index
          }));
      }
    } catch (riskErr) {
      console.warn(
        '[Route Risk] Risk enrichment failed; returning normal routes:',
        riskErr.message
      );
    }

    return res.json({ routes: enrichedRoutes });
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
