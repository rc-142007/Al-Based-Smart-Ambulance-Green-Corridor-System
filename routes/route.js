const express = require('express');
const router = express.Router();
const { recommendRoute } = require('../controllers/routeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// POST /api/route/recommend
router.post('/recommend', protect, authorize('ambulance'), recommendRoute);

module.exports = router;
