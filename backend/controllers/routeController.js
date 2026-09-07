const mapsService = require('../services/osmMaps');
const routeRiskEngine = require('../services/routeRiskEngine');

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
      const risks = await routeRiskEngine.scoreRoutes(
        routes,
        vehicleType || 'Truck'
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
