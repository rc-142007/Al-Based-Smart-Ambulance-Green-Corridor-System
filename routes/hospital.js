const express = require('express');
const router = express.Router();
const { getAllHospitals, getFilteredHospitals, getHospitalById } = require('../controllers/hospitalController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/hospitals
router.get('/', protect, getAllHospitals);

// GET /api/hospitals/filter?illness=heart_attack
router.get('/filter', protect, getFilteredHospitals);

// GET /api/hospitals/:id
router.get('/:id', protect, getHospitalById);

module.exports = router;
