const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema(
  {
    hospitalId: { type: String, required: true, unique: true, trim: true },
    hospitalName: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    distanceFromVignan_km: { type: Number },
    googleETA_min: { type: Number },
    emergencyAvailable: { type: Boolean, default: true },
    specialties: {
      cardiology:   { type: Boolean, default: false },
      neurology:    { type: Boolean, default: false },
      trauma:       { type: Boolean, default: false },
      orthopedics:  { type: Boolean, default: false },
      nephrology:   { type: Boolean, default: false },
      pulmonology:  { type: Boolean, default: false },
      criticalCare: { type: Boolean, default: false },
    },
    notes: { type: String },
  },
  { timestamps: true }
);

HospitalSchema.index({ latitude: 1, longitude: 1 });
HospitalSchema.index({ 'specialties.cardiology': 1 });
HospitalSchema.index({ 'specialties.neurology': 1 });
HospitalSchema.index({ 'specialties.trauma': 1 });
HospitalSchema.index({ emergencyAvailable: 1 });

module.exports = mongoose.model('Hospital', HospitalSchema);
