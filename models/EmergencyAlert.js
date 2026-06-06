const mongoose = require('mongoose');

const NotifiedPoliceSchema = new mongoose.Schema(
  {
    policeId:         { type: String, required: true },       // PI-GNT-01
    officerName:      { type: String },
    junctionId:       { type: String, required: true },       // J001
    junctionName:     { type: String },
    etaToJunction_min:{ type: Number },
    acknowledged:     { type: Boolean, default: false },
    acknowledgedAt:   { type: Date, default: null },
    cleared:          { type: Boolean, default: false },
    clearedAt:        { type: Date, default: null },
  },
  { _id: false }
);

const RouteSchema = new mongoose.Schema(
  {
    polyline:              { type: String },
    coordinates:           { type: Array, default: [] },        // [{lat,lng}] for Leaflet map
    distance_km:           { type: Number },
    googleETA_min:         { type: Number },
    predictedDelay_min:    { type: Number },
    finalETA_min:          { type: Number },
    junctionCount:         { type: Number },
    majorJunctionCount:    { type: Number },
    totalCongestionWeight: { type: Number },
    steps:                 { type: Array, default: [] },       // turn-by-turn with maneuverLocation
    junctionsOnRoute:      { type: Array, default: [] },       // junction objects on route
  },
  { _id: false }
);

const EmergencyAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      default: () => `ALERT-${Date.now()}`,
    },
    ambulanceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
    ambulanceCode: { type: String },   // e.g. AMB-101 (denormalized for quick display)
    driverName:    { type: String },

    patientSeverity: {
      type: String,
      enum: ['low', 'medium', 'critical'],
      required: true,
    },
    illnessType: {
      type: String,
      enum: ['heart_attack', 'stroke', 'trauma', 'road_accident', 'respiratory', 'general'],
      required: true,
    },

    currentLocation: {
      latitude:  { type: Number, required: true },
      longitude: { type: Number, required: true },
      address:   { type: String },
    },

    selectedHospital: {
      hospitalId:   { type: String },
      hospitalName: { type: String },
      latitude:     { type: Number },
      longitude:    { type: Number },
      address:      { type: String },
    },

    selectedRoute: RouteSchema,

    notifiedPolice: [NotifiedPoliceSchema],

    status: {
      type: String,
      enum: ['active', 'en_route', 'arrived', 'resolved', 'cancelled'],
      default: 'active',
    },

    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmergencyAlertSchema.index({ ambulanceId: 1 });
EmergencyAlertSchema.index({ status: 1 });
EmergencyAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmergencyAlert', EmergencyAlertSchema);
