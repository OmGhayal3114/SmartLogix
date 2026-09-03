const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
router.get('/', alertController.getAllAlerts);
router.get('/top10', alertController.getTop10Alerts);
router.get('/route', alertController.getRouteAlerts);
module.exports = router;
