/**
 * Maps illness types to required hospital specialty fields
 * Matches exactly the boolean specialty columns in Hospital model
 */
const ILLNESS_SPECIALTY_MAP = {
  heart_attack:  ['cardiology'],
  stroke:        ['neurology'],
  trauma:        ['trauma'],
  road_accident: ['trauma', 'criticalCare'],
  respiratory:   ['pulmonology', 'criticalCare'],
  general:       ['criticalCare'],
};

/**
 * Given an illness type, returns the list of required specialty fields
 * @param {string} illnessType
 * @returns {string[]} array of specialty field names
 */
const getRequiredSpecialties = (illnessType) => {
  return ILLNESS_SPECIALTY_MAP[illnessType] || ['criticalCare'];
};

/**
 * Human-readable illness labels for UI display
 */
const ILLNESS_LABELS = {
  heart_attack:  'Heart Attack',
  stroke:        'Stroke',
  trauma:        'Trauma',
  road_accident: 'Road Accident',
  respiratory:   'Respiratory Emergency',
  general:       'General Emergency',
};

const getIllnessLabel = (illnessType) => ILLNESS_LABELS[illnessType] || illnessType;

module.exports = { ILLNESS_SPECIALTY_MAP, getRequiredSpecialties, ILLNESS_LABELS, getIllnessLabel };
