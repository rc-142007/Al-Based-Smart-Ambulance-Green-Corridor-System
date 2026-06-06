const express = require('express');
const router = express.Router();
const { createAlert, getAlert, getActiveAlert, updateAlertStatus } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

// POST /api/alert — create emergency alert
router.post('/', protect, authorize('ambulance'), createAlert);

// GET /api/alert/active — get active alert for logged-in ambulance
router.get('/active', protect, authorize('ambulance'), getActiveAlert);

// GET /api/alert/:id
router.get('/:id', protect, getAlert);

// PATCH /api/alert/:id/status
router.patch('/:id/status', protect, updateAlertStatus);

module.exports = router;
