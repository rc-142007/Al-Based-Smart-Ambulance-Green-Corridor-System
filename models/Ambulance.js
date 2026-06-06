const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AmbulanceSchema = new mongoose.Schema(
  {
    ambulanceId:   { type: String, required: true, unique: true, trim: true },
    driverName:    { type: String, required: true, trim: true },
    username:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true, minlength: 6 },
    vehicleNumber: { type: String, trim: true },
    phone:         { type: String, trim: true },
    isActive:      { type: Boolean, default: true },
    role:          { type: String, default: 'ambulance', immutable: true },
  },
  { timestamps: true }
);

// Hash password before save
AmbulanceSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
AmbulanceSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never return password in JSON
AmbulanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Ambulance', AmbulanceSchema);
