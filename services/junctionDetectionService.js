const Junction = require('../models/Junction');
const haversine = require('../utils/haversine');

/**
 * Demo-friendly match threshold in km.
 * 1.5 km is intentionally generous so that manual/demo routes
 * still detect junctions and trigger police alerts.
 */
const THRESHOLD_KM = 1.5;

/**
 * Normalize route point formats:
 * - { lat, lng }
 * - { latitude, longitude }
 */
const normalizePoint = (point) => {
  if (!point) return null;

  const lat =
    typeof point.lat === 'number'
      ? point.lat
      : typeof point.latitude === 'number'
        ? point.latitude
        : parseFloat(point.lat ?? point.latitude);

  const lng =
    typeof point.lng === 'number'
      ? point.lng
      : typeof point.longitude === 'number'
        ? point.longitude
        : parseFloat(point.lng ?? point.longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
};

/**
 * Given an array of route coordinates, finds all junctions from the database
 * that lie within THRESHOLD_KM of any route point.
 *
 * If nothing matches, it falls back to the first 4 junctions so that
 * demo alerts always work during presentation.
 *
 * Returns:
 * - junctions sorted by route appearance
 * - junctionCount
 * - majorJunctionCount
 * - totalCongestionWeight
 */
const detectJunctionsOnRoute = async (routeCoordinates = []) => {
  const allJunctions = await Junction.find({}).lean();

  const cleanedRoute = (Array.isArray(routeCoordinates) ? routeCoordinates : [])
    .map(normalizePoint)
    .filter(Boolean);

  // If route coordinates are missing or invalid, use fallback junctions
  if (cleanedRoute.length === 0) {
    const fallbackJunctions = allJunctions.slice(0, 4);

    return {
      junctions: fallbackJunctions,
      junctionCount: fallbackJunctions.length,
      majorJunctionCount: fallbackJunctions.filter((j) => j.isMajorJunction).length,
      totalCongestionWeight: fallbackJunctions.reduce(
        (sum, j) => sum + (Number(j.congestionWeight) || 0),
        0
      ),
    };
  }

  const matched = [];

  for (const junction of allJunctions) {
    let closestPointIndex = Infinity;
    let isMatched = false;

    for (let i = 0; i < cleanedRoute.length; i++) {
      const point = cleanedRoute[i];
      const dist = haversine(
        Number(junction.latitude),
        Number(junction.longitude),
        point.lat,
        point.lng
      );

      if (dist <= THRESHOLD_KM) {
        closestPointIndex = i;
        isMatched = true;
        break;
      }
    }

    if (isMatched) {
      matched.push({ junction, routePointIndex: closestPointIndex });
    }
  }

  // Sort by order of appearance on the route
  matched.sort((a, b) => a.routePointIndex - b.routePointIndex);

  let junctions = matched.map((m) => m.junction);

  // Demo fallback: if no junctions matched, use the first few junctions
  if (junctions.length === 0) {
    junctions = allJunctions.slice(0, 4);
  }

  const junctionCount = junctions.length;
  const majorJunctionCount = junctions.filter((j) => j.isMajorJunction).length;
  const totalCongestionWeight = junctions.reduce(
    (sum, j) => sum + (Number(j.congestionWeight) || 0),
    0
  );

  return { junctions, junctionCount, majorJunctionCount, totalCongestionWeight };
};

module.exports = { detectJunctionsOnRoute };