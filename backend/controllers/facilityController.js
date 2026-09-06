const mapsService = require('../services/osmMaps');

exports.getFacilitiesNearRoute = async (req, res, next) => {
  try {
    const { origin, destination, types } = req.query;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required.' });
    const facilityTypes = types ? types.split(',') : ['hospital', 'lodging', 'gas_station'];
    const facilities = await mapsService.getFacilitiesAlongRoute(origin, destination, facilityTypes);
    res.json({ facilities });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'OpenStreetMap facility search is temporarily unavailable.' });
  }
};
