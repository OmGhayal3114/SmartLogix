const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const tripController = require('../controllers/tripController');

router.use(protect);
router.post('/', tripController.createTrip);
router.get('/', tripController.getMyTrips);
router.get('/:id', tripController.getTrip);
router.delete('/:id', tripController.deleteTrip);

module.exports = router;
