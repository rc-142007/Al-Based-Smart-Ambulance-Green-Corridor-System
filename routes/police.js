const express = require('express');
const router = express.Router();
const { getPoliceAlerts, acknowledgeAlert, clearRoute, getMyJunction } = require('../controllers/policeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/police/junction — get assigned junction info
router.get('/junction', protect, authorize('police'), getMyJunction);

// GET /api/police/alerts — get alerts for this police officer
router.get('/alerts', protect, authorize('police'), getPoliceAlerts);

// PATCH /api/police/alert/:alertId/acknowledge
router.patch('/alert/:alertId/acknowledge', protect, authorize('police'), acknowledgeAlert);

// PATCH /api/police/alert/:alertId/clear
router.patch('/alert/:alertId/clear', protect, authorize('police'), clearRoute);

module.exports = router;
