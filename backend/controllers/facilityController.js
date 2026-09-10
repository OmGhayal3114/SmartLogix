const mapsService = require('../services/osmMaps');

exports.getFacilitiesNearRoute = async (req, res, next) => {
  try {
    // Support both GET (legacy) and POST (with routeCoords)
    const origin = req.body?.origin || req.query?.origin;
    const destination = req.body?.destination || req.query?.destination;
    const rawTypes = req.body?.types || req.query?.types;
    const routeCoords = req.body?.routeCoords || []; // GeoJSON [lng,lat][] from OSRM

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    const facilityTypes = rawTypes
      ? (Array.isArray(rawTypes) ? rawTypes : rawTypes.split(','))
      : ['hospital', 'lodging', 'gas_station', 'car_repair', 'parking', 'restaurant'];

    const facilities = await mapsService.getFacilitiesAlongRoute(
      origin,
      destination,
      facilityTypes,
      routeCoords
    );

    res.json({ facilities });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'OpenStreetMap facility search is temporarily unavailable.' });
  }
};
