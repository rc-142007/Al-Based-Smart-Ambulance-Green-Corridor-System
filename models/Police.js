const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PoliceSchema = new mongoose.Schema(
  {
    policeId:          { type: String, required: true, unique: true, trim: true }, // e.g. PI-GNT-01
    officerName:       { type: String, required: true, trim: true },
    badgeNumber:       { type: String, trim: true },
    username:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:          { type: String, required: true, minlength: 6 },
    assignedJunctionId:{ type: String, trim: true }, // matches Junction.junctionId
    phone:             { type: String, trim: true },
    isOnDuty:          { type: Boolean, default: true },
    role:              { type: String, default: 'police', immutable: true },
  },
  { timestamps: true }
);

// Hash password before save
PoliceSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
PoliceSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never return password in JSON
PoliceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Police', PoliceSchema);
