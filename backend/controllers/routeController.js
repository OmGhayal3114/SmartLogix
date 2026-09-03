const mapsService = require('../services/googleMaps');

exports.calculateRoutes = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType } = req.body;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required.' });
    const routes = await mapsService.getRoutes(origin, destination, vehicleType);
    res.json({ routes });
  } catch (err) {
    if (err.message === 'MAPS_API_ERROR') return res.status(502).json({ error: 'Route calculation failed. Please check the origin and destination and try again.' });
    next(err);
  }
};
