const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
router.post('/route-risk', mlController.predictRouteRisk);
router.post('/predict', mlController.predictRouteRisk);
router.post('/route-risk-analysis', mlController.analyzeRouteRisk);
router.get('/health', (req, res) => res.json({ status: 'ok', engine: 'routeRiskEngine-v1' }));

module.exports = router;
