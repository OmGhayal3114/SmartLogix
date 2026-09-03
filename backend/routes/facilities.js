const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
router.get('/near-route', facilityController.getFacilitiesNearRoute);
module.exports = router;
