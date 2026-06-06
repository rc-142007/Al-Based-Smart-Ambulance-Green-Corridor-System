const Hospital = require('../models/Hospital');
const { getRequiredSpecialties } = require('../utils/illnessSpecialtyMap');
const { getHospitalRecommendation } =
require('../services/hospitalai');

// @desc    Get all hospitals
// @route   GET /api/hospitals
// @access  Protected


const getAllHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({
      emergencyAvailable: true
    });

    const emergencyType =
      req.query.emergencyType || "cardiology";

    const recommendation =
      getHospitalRecommendation(
        hospitals,
        emergencyType
      );

    res.status(200).json({
      success: true,
      emergencyType,
      recommendedHospital:
        recommendation.hospitalName,
      aiScore:
        recommendation.aiScore,
      reasons:
        recommendation.reasons,
      hospital: recommendation
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Get hospitals filtered by illness type
// @route   GET /api/hospitals/filter?illness=heart_attack
// @access  Protected
const getFilteredHospitals = async (req, res, next) => {
  try {
    const { illness } = req.query;
    if (!illness) {
      return res.status(400).json({ success: false, message: 'illness query parameter is required.' });
    }

    const requiredSpecialties = getRequiredSpecialties(illness);

    // Build query: hospital must have at least ONE of the required specialties
    const specialtyQuery = requiredSpecialties.map((s) => ({ [`specialties.${s}`]: true }));
    const query = {
      emergencyAvailable: true,
      $or: specialtyQuery,
    };

    const hospitals = await Hospital.find(query);
    res.status(200).json({
      success: true,
      illnessType: illness,
      requiredSpecialties,
      count: hospitals.length,
      hospitals,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single hospital by MongoDB _id or hospitalId
// @route   GET /api/hospitals/:id
// @access  Protected
const getHospitalById = async (req, res, next) => {
  try {
    const hospital =
      (await Hospital.findById(req.params.id).catch(() => null)) ||
      (await Hospital.findOne({ hospitalId: req.params.id }));

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    res.status(200).json({ success: true, hospital });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllHospitals, getFilteredHospitals, getHospitalById };
