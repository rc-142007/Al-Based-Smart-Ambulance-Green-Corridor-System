const Hospital = require('../models/Hospital');
const { getRequiredSpecialties } = require('../utils/illnessSpecialtyMap');

/**
 * Filter hospitals by illness type (specialty match) and emergency availability.
 * Returns only hospitals that can treat the patient's condition.
 *
 * @param {string} illnessType  - e.g. 'heart_attack'
 * @returns {Promise<Array>} matching Hospital documents
 */
const filterHospitalsByIllness = async (illnessType) => {
  const requiredSpecialties = getRequiredSpecialties(illnessType);

  // Match hospitals that have at least ONE of the required specialties = true
  const orConditions = requiredSpecialties.map((specialty) => ({
    [`specialties.${specialty}`]: true,
  }));

  return await Hospital.find({
    emergencyAvailable: true,
    $or: orConditions,
  });
};

module.exports = { filterHospitalsByIllness };
