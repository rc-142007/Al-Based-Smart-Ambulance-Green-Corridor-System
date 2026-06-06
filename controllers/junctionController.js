const Junction = require('../models/Junction');
const haversine = require('../utils/haversine');

const JUNCTION_MATCH_THRESHOLD_KM = 0.08; // 80 metres

// @desc    Get all junctions
// @route   GET /api/junctions
const getAllJunctions = async (req, res, next) => {
  try {
    const junctions = await Junction.find({});
    res.status(200).json({ success: true, count: junctions.length, junctions });
  } catch (err) { next(err); }
};

// @desc    Detect junctions that lie on a given route
// @route   POST /api/junctions/on-route
// Body: { routeCoordinates: [{lat, lng}, ...] }
const getJunctionsOnRoute = async (req, res, next) => {
  try {
    const { routeCoordinates } = req.body;
    if (!routeCoordinates || !Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
      return res.status(400).json({ success: false, message: 'routeCoordinates array is required.' });
    }

    const allJunctions = await Junction.find({});
    const matchedJunctions = [];

    for (const junction of allJunctions) {
      let matched = false;
      for (const point of routeCoordinates) {
        const dist = haversine(junction.latitude, junction.longitude, point.lat, point.lng);
        if (dist <= JUNCTION_MATCH_THRESHOLD_KM) {
          matched = true;
          break;
        }
      }
      if (matched) matchedJunctions.push(junction);
    }

    const junctionCount         = matchedJunctions.length;
    const majorJunctionCount    = matchedJunctions.filter((j) => j.isMajorJunction).length;
    const totalCongestionWeight = matchedJunctions.reduce((sum, j) => sum + j.congestionWeight, 0);

    res.status(200).json({
      success: true,
      junctionCount,
      majorJunctionCount,
      totalCongestionWeight,
      junctions: matchedJunctions,
    });
  } catch (err) { next(err); }
};

module.exports = { getAllJunctions, getJunctionsOnRoute };
