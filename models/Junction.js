const mongoose = require('mongoose');

const JunctionSchema = new mongoose.Schema(
  {
    junctionId:      { type: String, required: true, unique: true, trim: true },
    junctionName:    { type: String, required: true, trim: true },
    latitude:        { type: Number, required: true },
    longitude:       { type: Number, required: true },
    junctionType:    { type: String, trim: true },
    isMajorJunction: { type: Boolean, default: false },
    congestionWeight:{ type: Number, default: 1, min: 1, max: 10 },
    assignedPoliceId:{ type: String, trim: true }, // e.g. PI-GNT-01
    remarks:         { type: String },
  },
  { timestamps: true }
);

JunctionSchema.index({ latitude: 1, longitude: 1 });
JunctionSchema.index({ assignedPoliceId: 1 });

module.exports = mongoose.model('Junction', JunctionSchema);
