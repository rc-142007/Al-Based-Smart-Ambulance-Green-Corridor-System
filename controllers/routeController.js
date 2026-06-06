const { filterHospitalsByIllness } = require('../services/hospitalFilterService');
const { getRoutes, reverseGeocode } = require('../services/googleMapsService');
const { detectJunctionsOnRoute } = require('../services/junctionDetectionService');
const { predictDelay, buildMLFeatures } = require('../services/mlService');
const { calculateFinalETA } = require('../utils/etaCalculator');

/**
 * Core route recommendation engine.
 *
 * Workflow:
 *  1. Filter hospitals by illness type
 *  2. For each hospital → call Google Directions API
 *  3. Detect junctions on each route (Haversine)
 *  4. Call ML model → predicted delay
 *  5. Final ETA = Google ETA + Predicted Delay
 *  6. Select hospital with lowest Final ETA
 *  7. Return recommendation + all evaluated hospitals
 *
 * @route POST /api/route/recommend
 * @body  { currentLat, currentLng, illnessType, severity, weather?, holiday? }
 */
const recommendRoute = async (req, res, next) => {
  try {
    const { currentLat, currentLng, illnessType, severity, weather = 'Clear', holiday = 0 } = req.body;

    if (!currentLat || !currentLng || !illnessType || !severity) {
      return res.status(400).json({
        success: false,
        message: 'currentLat, currentLng, illnessType, and severity are required.',
      });
    }

    // ── Step 1: Filter eligible hospitals by illness ────────────────────────
    const hospitals = await filterHospitalsByIllness(illnessType);

    if (!hospitals.length) {
      return res.status(404).json({
        success: false,
        message: `No hospitals found that can treat: ${illnessType}`,
      });
    }

    // ── Step 2–5: Evaluate each hospital ───────────────────────────────────
    const evaluations = [];

    for (const hospital of hospitals) {
      try {
        // Get routes from Google Directions API
        const routes = await getRoutes(currentLat, currentLng, hospital.latitude, hospital.longitude);
        if (!routes || !routes.length) continue;

        // Use the first (best) route Google returns
        const bestRoute = routes[0];

        // Detect junctions on this route
        const junctionData = await detectJunctionsOnRoute(bestRoute.coordinates);

        // Build ML feature set and get predicted delay
        const features = buildMLFeatures({
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
          route: {
            ...bestRoute,
            junctionCount:         junctionData.junctionCount,
            majorJunctionCount:    junctionData.majorJunctionCount,
            totalCongestionWeight: junctionData.totalCongestionWeight,
            junctions:             junctionData.junctions,
            predictedDelay_min,
            finalETA_min,
          },
        });
      } catch (hospitalErr) {
        // Skip this hospital if routing fails — don't crash the whole request
        console.warn(`⚠️  Could not evaluate hospital ${hospital.hospitalName}:`, hospitalErr.message);
      }
    }

    if (!evaluations.length) {
      return res.status(503).json({
        success: false,
        message: 'Unable to calculate routes to any eligible hospitals. Check Google Maps API key.',
      });
    }

    // ── Step 6: Select best hospital (lowest Final ETA) ────────────────────
    evaluations.sort((a, b) => a.route.finalETA_min - b.route.finalETA_min);
    const best = evaluations[0];

    // Get a human-readable address for current location
    let currentAddress = '';
    try {
      currentAddress = await reverseGeocode(currentLat, currentLng);
    } catch (_) {}

    // ── Step 7: Build response ─────────────────────────────────────────────
    const allEvaluated = evaluations.map((e) => ({
      hospitalId:        e.hospital.hospitalId,
      hospitalName:      e.hospital.hospitalName,
      distance_km:       e.route.distance_km,
      googleETA_min:     e.route.googleETA_min,
      predictedDelay_min:e.route.predictedDelay_min,
      finalETA_min:      e.route.finalETA_min,
      junctionCount:     e.route.junctionCount,
      majorJunctionCount:e.route.majorJunctionCount,
      totalCongestionWeight: e.route.totalCongestionWeight,
      isSelected:        e.hospital.hospitalId === best.hospital.hospitalId,
    }));

    return res.status(200).json({
      success: true,
      currentLocation: {
        latitude:  parseFloat(currentLat),
        longitude: parseFloat(currentLng),
        address:   currentAddress,
      },
      recommendedHospital: {
        hospitalId:   best.hospital.hospitalId,
        hospitalName: best.hospital.hospitalName,
        address:      best.hospital.address,
        latitude:     best.hospital.latitude,
        longitude:    best.hospital.longitude,
        notes:        best.hospital.notes,
      },
      route: {
        polyline:              best.route.polyline,
        distance_km:           best.route.distance_km,
        googleETA_min:         best.route.googleETA_min,
        predictedDelay_min:    best.route.predictedDelay_min,
        finalETA_min:          best.route.finalETA_min,
        junctionCount:         best.route.junctionCount,
        majorJunctionCount:    best.route.majorJunctionCount,
        totalCongestionWeight: best.route.totalCongestionWeight,
        steps:                 best.route.steps,
        junctions:             best.route.junctions.map((j) => ({
          junctionId:       j.junctionId,
          junctionName:     j.junctionName,
          isMajorJunction:  j.isMajorJunction,
          congestionWeight: j.congestionWeight,
          latitude:         j.latitude,
          longitude:        j.longitude,
        })),
      },
      allHospitalsEvaluated: allEvaluated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { recommendRoute };
