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

    const originCoords = req.body?.originCoords || null;
    const destinationCoords = req.body?.destinationCoords || null;
    const userLocation = req.body?.userLocation || null;

    const ALL_CATEGORIES = [
      'hospital',
      'pharmacy',
      'police',
      'gas_station',
      'lodging',
      'car_repair',
      'parking',
      'restaurant',
      'restroom'
    ];

    const facilityTypes = rawTypes
      ? (Array.isArray(rawTypes) ? rawTypes : rawTypes.split(',')).filter(t => t !== 'atm')
      : ALL_CATEGORIES;

    const facilities = await mapsService.getFacilitiesAlongRoute(
      origin,
      destination,
      facilityTypes,
      routeCoords,
      { originCoords, destinationCoords, userLocation }
    );

    res.json({ facilities: facilities || [] });
  } catch (err) {
    console.warn('[Facilities Controller] Error fetching facilities:', err.message);
    return res.json({ facilities: [] });
  }
};
