const EmergencyAlert = require('../models/EmergencyAlert');
const { createEmergencyAlert, emitArrival } = require('../services/alertService');
const { filterHospitalsByIllness } = require('../services/hospitalFilterService');
const { getRoutes, reverseGeocode } = require('../services/googleMapsService');
const { detectJunctionsOnRoute } = require('../services/junctionDetectionService');
const { predictDelay, buildMLFeatures } = require('../services/mlService');
const { calculateFinalETA } = require('../utils/etaCalculator');

// @desc    Create emergency alert (full workflow: route + junction + ML + socket)
// @route   POST /api/alert
// @access  Ambulance only
const createAlert = async (req, res, next) => {
  try {
    const { patientSeverity, illnessType, currentLat, currentLng, weather = 'Clear', holiday = 0 } = req.body;

    if (!patientSeverity || !illnessType || !currentLat || !currentLng) {
      return res.status(400).json({
        success: false,
        message: 'patientSeverity, illnessType, currentLat, and currentLng are required.',
      });
    }

    // Check for existing active alert for this ambulance
    const existingAlert = await EmergencyAlert.findOne({
      ambulanceId: req.user._id,
      status: { $in: ['active', 'en_route'] },
    });
    if (existingAlert) {
      return res.status(409).json({
        success: false,
        message: 'There is already an active alert for this ambulance.',
        alertId: existingAlert._id,
      });
    }

    // ── Replicate route recommendation logic ─────────────────────────────────
    const hospitals = await filterHospitalsByIllness(illnessType);
    if (!hospitals.length) {
      return res.status(404).json({ success: false, message: `No hospitals for illness: ${illnessType}` });
    }

    const evaluations = [];
    for (const hospital of hospitals) {
      try {
        const routes = await getRoutes(currentLat, currentLng, hospital.latitude, hospital.longitude);
        if (!routes || !routes.length) continue;

        const bestRoute    = routes[0];
        const junctionData = await detectJunctionsOnRoute(bestRoute.coordinates);
        const features     = buildMLFeatures({
          googleETA_min:         bestRoute.googleETA_min,
          distance_km:           bestRoute.distance_km,
          junctionCount:         junctionData.junctionCount,
          majorJunctionCount:    junctionData.majorJunctionCount,
          totalCongestionWeight: junctionData.totalCongestionWeight,
          weather,
          holiday,
        });

        const predictedDelay_min = await predictDelay(features);
        const finalETA_min       = calculateFinalETA(bestRoute.googleETA_min, predictedDelay_min);

        evaluations.push({
          hospital,
          route: { ...bestRoute, ...junctionData, predictedDelay_min, finalETA_min },
        });
      } catch (_) {}
    }

    if (!evaluations.length) {
      return res.status(503).json({ success: false, message: 'Could not compute routes to any hospital. Check your network connection.' });
    }

    evaluations.sort((a, b) => a.route.finalETA_min - b.route.finalETA_min);
    const best = evaluations[0];

    let currentAddress = '';
    try { currentAddress = await reverseGeocode(currentLat, currentLng); } catch (_) {}

    // ── Create alert + emit socket ────────────────────────────────────────────
    const alert = await createEmergencyAlert({
      ambulance: req.user,
      patientSeverity,
      illnessType,
      currentLocation: { latitude: parseFloat(currentLat), longitude: parseFloat(currentLng), address: currentAddress },
      selectedHospital: best.hospital,
      selectedRoute: best.route,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency alert created. Police officers notified.',
      alert: {
        alertId:          alert._id,
        alertCode:        alert.alertId,
        status:           alert.status,
        patientSeverity,
        illnessType,
        selectedHospital: alert.selectedHospital,
        selectedRoute:    alert.selectedRoute,
        notifiedPolice:   alert.notifiedPolice.length,
        allHospitalsEvaluated: evaluations.map((e) => ({
          hospitalId:         e.hospital.hospitalId,
          hospitalName:       e.hospital.hospitalName,
          distance_km:        e.route.distance_km,
          googleETA_min:      e.route.googleETA_min,
          predictedDelay_min: e.route.predictedDelay_min,
          finalETA_min:       e.route.finalETA_min,
          junctionCount:      e.route.junctionCount,
          majorJunctionCount: e.route.majorJunctionCount,
          isSelected:         e.hospital.hospitalId === best.hospital.hospitalId,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get alert by ID
// @route   GET /api/alert/:id
// @access  Protected
const getAlert = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id)
      .populate('ambulanceId', 'ambulanceId driverName vehicleNumber phone');
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.status(200).json({ success: true, alert });
  } catch (err) { next(err); }
};

// @desc    Get the active alert for the logged-in ambulance
// @route   GET /api/alert/active
// @access  Ambulance only
const getActiveAlert = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findOne({
      ambulanceId: req.user._id,
      status: { $in: ['active', 'en_route'] },
    });
    res.status(200).json({ success: true, alert: alert || null });
  } catch (err) { next(err); }
};

// @desc    Update alert status (arrived / resolved / cancelled)
// @route   PATCH /api/alert/:id/status
// @access  Protected
const updateAlertStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'en_route', 'arrived', 'resolved', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    const update = { status };
    if (status === 'resolved' || status === 'arrived') update.resolvedAt = new Date();

    const alert = await EmergencyAlert.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });

    // Notify police that ambulance has arrived
    if (status === 'arrived') emitArrival(alert);

    res.status(200).json({ success: true, alert });
  } catch (err) { next(err); }
};

module.exports = { createAlert, getAlert, getActiveAlert, updateAlertStatus };
