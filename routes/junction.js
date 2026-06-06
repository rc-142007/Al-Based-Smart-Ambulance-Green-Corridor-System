const express = require('express');
const router = express.Router();
const { getAllJunctions, getJunctionsOnRoute } = require('../controllers/junctionController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/junctions
router.get('/', protect, getAllJunctions);

// POST /api/junctions/on-route
router.post('/on-route', protect, getJunctionsOnRoute);

module.exports = router;
