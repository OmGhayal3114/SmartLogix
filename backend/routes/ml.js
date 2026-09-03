const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
router.post('/route-risk', mlController.predictRouteRisk);
module.exports = router;
