const mapsService = require('../services/osmMaps');

exports.calculateRoutes = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType } = req.body;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required.' });
    const routes = await mapsService.getRoutes(origin, destination, vehicleType);
    res.json({ routes });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Route calculation service is temporarily unavailable.' });
  }
};
