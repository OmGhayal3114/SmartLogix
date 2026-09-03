const Trip = require('../models/Trip');

exports.createTrip = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType, route, distance, estimatedTime, riskLevel, riskReason } = req.body;
    if (!origin || !destination || !vehicleType) return res.status(400).json({ error: 'Origin, destination, and vehicle type are required.' });
    const trip = await Trip.create({ userId: req.user._id, origin, destination, vehicleType, route: route || {}, distance: distance || '', estimatedTime: estimatedTime || '', riskLevel: riskLevel || 'UNKNOWN', riskReason: riskReason || '' });
    res.status(201).json({ trip });
  } catch (err) { next(err); }
};

exports.getMyTrips = async (req, res, next) => {
  try {
    const trips = await Trip.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ trips });
  } catch (err) { next(err); }
};

exports.getTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ trip });
  } catch (err) { next(err); }
};

exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ message: 'Trip deleted.' });
  } catch (err) { next(err); }
};
