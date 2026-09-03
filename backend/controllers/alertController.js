const Alert = require('../models/Alert');

exports.getAllAlerts = async (req, res, next) => {
  try {
    const { state, severity, status = 'active' } = req.query;
    const filter = { status };
    if (state) filter.state = state;
    if (severity) filter.severity = severity;
    const alerts = await Alert.find(filter).sort({ priorityScore: -1, createdAt: -1 }).limit(50);
    res.json({ alerts, count: alerts.length });
  } catch (err) { next(err); }
};

exports.getTop10Alerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ status: 'active' }).sort({ priorityScore: -1, createdAt: -1 }).limit(10);
    res.json({ alerts, count: alerts.length, lastUpdated: alerts[0]?.updatedAt || null });
  } catch (err) { next(err); }
};

exports.getRouteAlerts = async (req, res, next) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination are required.' });
    const nerStates = ['Assam','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Sikkim','Tripura','NER General'];
    const allAlerts = await Alert.find({ status: 'active', state: { $in: nerStates } }).sort({ priorityScore: -1, createdAt: -1 }).limit(20);
    const routeTerms = [origin, destination].map(t => t.toLowerCase());
    const routeAlerts = allAlerts.filter(a => {
      const text = (a.location + ' ' + a.district + ' ' + a.description).toLowerCase();
      return routeTerms.some(term => text.includes(term));
    });
    const result = routeAlerts.length > 0 ? routeAlerts : allAlerts.slice(0, 3);
    res.json({ alerts: result, routeSpecific: routeAlerts.length > 0 });
  } catch (err) { next(err); }
};
