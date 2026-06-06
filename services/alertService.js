const EmergencyAlert = require('../models/EmergencyAlert');
const Police = require('../models/Police');
const { getIO } = require('../config/socket');
const { calculateJunctionETA } = require('../utils/etaCalculator');
const haversine = require('../utils/haversine');

/**
 * Creates an EmergencyAlert document and emits real-time Socket.IO
 * alerts to all police officers whose junctions are on the selected route.
 *
 * @param {Object} params
 * @returns {Promise<EmergencyAlert>} saved alert document
 */
const createEmergencyAlert = async ({
  ambulance,
  patientSeverity,
  illnessType,
  currentLocation,
  selectedHospital,
  selectedRoute,
}) => {
  const { junctions, distance_km, finalETA_min } = selectedRoute;

  // ── Build notifiedPolice list ──────────────────────────────────────────────
  const notifiedPolice = [];

  for (const junction of junctions) {
    if (!junction.assignedPoliceId) continue;

    // Find the police officer assigned to this junction
    const officer = await Police.findOne({ policeId: junction.assignedPoliceId });
    if (!officer) continue;

    // Estimate ETA to this junction (proportional to distance along route)
    const distToJunction = haversine(
      currentLocation.latitude, currentLocation.longitude,
      junction.latitude,        junction.longitude
    );
    const etaToJunction_min = calculateJunctionETA(finalETA_min, distToJunction, distance_km);

    notifiedPolice.push({
      policeId:          officer.policeId,
      officerName:       officer.officerName,
      junctionId:        junction.junctionId,
      junctionName:      junction.junctionName,
      etaToJunction_min,
      acknowledged:      false,
      acknowledgedAt:    null,
      cleared:           false,
      clearedAt:         null,
    });
  }

  // ── Create and save alert document ────────────────────────────────────────
  const alertId = `ALERT-${Date.now()}`;

  const alert = await EmergencyAlert.create({
    alertId,
    ambulanceId:   ambulance._id,
    ambulanceCode: ambulance.ambulanceId,
    driverName:    ambulance.driverName,
    patientSeverity,
    illnessType,
    currentLocation,
    selectedHospital: {
      hospitalId:   selectedHospital.hospitalId,
      hospitalName: selectedHospital.hospitalName,
      latitude:     selectedHospital.latitude,
      longitude:    selectedHospital.longitude,
      address:      selectedHospital.address,
    },
    selectedRoute: {
      polyline:              selectedRoute.polyline,
      coordinates:           selectedRoute.coordinates || [],   // [{lat,lng}] for Leaflet map
      distance_km:           selectedRoute.distance_km,
      googleETA_min:         selectedRoute.googleETA_min,
      predictedDelay_min:    selectedRoute.predictedDelay_min,
      finalETA_min:          selectedRoute.finalETA_min,
      junctionCount:         selectedRoute.junctionCount,
      majorJunctionCount:    selectedRoute.majorJunctionCount,
      totalCongestionWeight: selectedRoute.totalCongestionWeight,
      steps:                 selectedRoute.steps,
      junctionsOnRoute:      junctions.map((j) => ({
        junctionId:       j.junctionId,
        junctionName:     j.junctionName,
        latitude:         j.latitude,
        longitude:        j.longitude,
        isMajorJunction:  j.isMajorJunction,
        congestionWeight: j.congestionWeight,
      })),
    },
    notifiedPolice,
    status: 'active',
  });

  // ── Emit real-time Socket.IO alerts to each police officer ─────────────────
  try {
    const io = getIO();
    for (const np of notifiedPolice) {
      const payload = {
        alertId:          alert._id,
        alertCode:        alertId,
        ambulanceId:      ambulance.ambulanceId,
        driverName:       ambulance.driverName,
        patientSeverity,
        illnessType,
        hospitalName:     selectedHospital.hospitalName,
        junctionName:     np.junctionName,
        etaToJunction_min:np.etaToJunction_min,
        finalETA_min:     selectedRoute.finalETA_min,
        distance_km:      selectedRoute.distance_km,
        message:          `🚑 Ambulance incoming! ETA to your junction: ${np.etaToJunction_min} min. Clear the route immediately.`,
      };

      // Emit to the police officer's personal room
      io.to(`police:${np.policeId}`).emit('ambulance:alert', payload);
    }

    // Also emit to ambulance room — confirmation
    io.to(`ambulance:${ambulance.ambulanceId}`).emit('alert:created', {
      alertId: alert._id,
      alertCode: alertId,
      status: 'active',
      notifiedCount: notifiedPolice.length,
    });
  } catch (socketErr) {
    console.warn('⚠️  Socket.IO emit failed (non-fatal):', socketErr.message);
  }

  return alert;
};

/**
 * Emit an ETA update to all police on the active route
 */
const emitETAUpdate = (alert, updatedETA) => {
  try {
    const io = getIO();
    for (const np of alert.notifiedPolice) {
      io.to(`police:${np.policeId}`).emit('ambulance:eta_update', {
        alertId: alert._id,
        newETA:  updatedETA,
      });
    }
  } catch (err) {
    console.warn('⚠️  ETA update socket emit failed:', err.message);
  }
};

/**
 * Emit arrival notification to all notified police
 */
const emitArrival = (alert) => {
  try {
    const io = getIO();
    for (const np of alert.notifiedPolice) {
      io.to(`police:${np.policeId}`).emit('ambulance:arrived', {
        alertId:     alert._id,
        hospitalName:alert.selectedHospital?.hospitalName,
      });
    }
  } catch (err) {
    console.warn('⚠️  Arrival socket emit failed:', err.message);
  }
};

module.exports = { createEmergencyAlert, emitETAUpdate, emitArrival };
