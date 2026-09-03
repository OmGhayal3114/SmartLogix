const axios = require('axios');

exports.predictRouteRisk = async (req, res, next) => {
  try {
    const { origin, destination, vehicleType } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    try {
      const mlResponse = await axios.post(`${mlUrl}/predict`, {
        origin,
        destination,
        vehicle_type: vehicleType || 'Truck'
      }, { timeout: 10000 });
      return res.json(mlResponse.data);
    } catch (mlErr) {
      // ML service unavailable — rule-based fallback using DB alerts
      console.warn('[ML] Service unavailable, using rule-based fallback:', mlErr.message);

      const Alert = require('../models/Alert');
      const activeAlerts = await Alert.find({
        status: 'active',
        $or: [
          { location: { $regex: origin, $options: 'i' } },
          { location: { $regex: destination, $options: 'i' } },
          { severity: { $in: ['HIGH', 'CRITICAL'] } }
        ]
      }).limit(10);

      let risk = 'LOW';
      let score = 0.15;
      const reasons = [];

      const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL');
      const highAlerts = activeAlerts.filter(a => a.severity === 'HIGH');
      const routeAlerts = activeAlerts.filter(a => {
        const text = (a.location + ' ' + a.description).toLowerCase();
        return text.includes(origin.toLowerCase()) || text.includes(destination.toLowerCase());
      });

      if (criticalAlerts.length > 0) {
        risk = 'HIGH'; score = 0.85;
        reasons.push(`${criticalAlerts.length} CRITICAL alert(s) active in the region.`);
      } else if (highAlerts.length >= 2 || routeAlerts.length >= 2) {
        risk = 'HIGH'; score = 0.72;
        reasons.push('Multiple HIGH severity alerts detected near route.');
      } else if (highAlerts.length === 1 || routeAlerts.length === 1) {
        risk = 'MEDIUM'; score = 0.50;
        reasons.push(`Alert(s) detected affecting this corridor.`);
      } else {
        reasons.push('No significant alerts detected along this route.');
      }

      return res.json({
        risk,
        score,
        reason: reasons.join(' '),
        source: 'rule-based-fallback',
        note: 'ML service unavailable. Using alert-based risk assessment.'
      });
    }
  } catch (err) {
    next(err);
  }
};
