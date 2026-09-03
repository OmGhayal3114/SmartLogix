const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
router.post('/', routeController.calculateRoutes);
module.exports = router;
