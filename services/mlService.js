const axios = require('axios');

const ML_URL = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Weather label encoding (must match what the ML model was trained on)
const WEATHER_OPTIONS = ['Clear', 'Cloudy', 'Rainy', 'Foggy', 'Stormy'];

/**
 * Call the Python FastAPI ML microservice to get a predicted delay.
 *
 * @param {Object} features
 * @param {number} features.dayOfWeek    - 0=Monday … 6=Sunday
 * @param {number} features.hour         - 0–23
 * @param {number} features.month        - 1–12
 * @param {number} features.holiday      - 0 or 1
 * @param {string} features.weather      - 'Clear' | 'Cloudy' | 'Rainy' | 'Foggy' | 'Stormy'
 * @param {number} features.googleETA_min
 * @param {number} features.distance_km
 * @param {number} features.junctionCount
 * @param {number} features.majorJunctionCount
 * @param {number} features.totalCongestionWeight
 *
 * @returns {number} predictedDelay_min (rounded to 1dp)
 */
const predictDelay = async (features) => {
  try {
    const response = await axios.post(`${ML_URL()}/predict`, features, {
      timeout: 8000, // 8 second timeout
    });
    const delay = parseFloat(response.data.predictedDelay_min);
    return isNaN(delay) ? 0 : Math.max(0, Math.round(delay * 10) / 10);
  } catch (err) {
    // If ML service is unavailable, return 0 delay (graceful degradation)
    console.warn('⚠️  ML service unavailable — using 0 delay fallback:', err.message);
    return 0;
  }
};

/**
 * Build ML input features from current time and route data.
 * Automatically extracts dayOfWeek, hour, month from current timestamp.
 * dayOfWeek is sent as a string name (e.g. 'Saturday') to match training CSV.
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const buildMLFeatures = ({ googleETA_min, distance_km, junctionCount, majorJunctionCount, totalCongestionWeight, weather = 'Clear', holiday = 0 }) => {
  const now = new Date();
  return {
    dayOfWeek:             DAY_NAMES[now.getDay()],  // string to match training CSV
    hour:                  now.getHours(),
    month:                 now.getMonth() + 1,        // 1–12
    holiday,
    weather,
    googleETA_min,
    distance_km,
    junctionCount,
    majorJunctionCount,
    totalCongestionWeight,
  };
};

module.exports = { predictDelay, buildMLFeatures };
