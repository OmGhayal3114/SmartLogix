const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.post('/', routeController.calculateRoutes);
router.post('/waypoint', routeController.calculateWaypointRoute);
router.get('/suggest', routeController.suggestLocations);
router.get('/reverse-geocode', routeController.reverseGeocodeLocation);

module.exports = router;
