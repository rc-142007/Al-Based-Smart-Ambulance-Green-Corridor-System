/**
 * Final ETA = Google ETA + Predicted Delay
 * All values in minutes, rounded to 1 decimal place
 */
const calculateFinalETA = (googleETA_min, predictedDelay_min) => {
  const google = parseFloat(googleETA_min) || 0;
  const delay  = parseFloat(predictedDelay_min) || 0;
  return Math.round((google + delay) * 10) / 10;
};

/**
 * ETA from current location to a specific junction point on the route
 * Based on fraction of total route distance covered to that junction
 */
const calculateJunctionETA = (totalETA_min, distanceToJunction_km, totalDistance_km) => {
  if (!totalDistance_km || totalDistance_km === 0) return totalETA_min;
  const fraction = distanceToJunction_km / totalDistance_km;
  return Math.round(totalETA_min * fraction * 10) / 10;
};

module.exports = { calculateFinalETA, calculateJunctionETA };
