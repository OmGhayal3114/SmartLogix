const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
// GET: legacy support; POST: preferred (sends routeCoords geometry)
router.get('/near-route', facilityController.getFacilitiesNearRoute);
router.post('/near-route', facilityController.getFacilitiesNearRoute);
module.exports = router;
