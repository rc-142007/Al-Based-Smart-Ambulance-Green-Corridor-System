const jwt = require('jsonwebtoken');
const Ambulance = require('../models/Ambulance');
const Police = require('../models/Police');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Login ambulance driver or police officer
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username, password, and role are required.' });
    }

    let user;
    if (role === 'ambulance') {
      user = await Ambulance.findOne({ username });
    } else if (role === 'police') {
      user = await Police.findOne({ username });
    } else {
      return res.status(400).json({ success: false, message: 'Role must be ambulance or police.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id, role);

    // Build response payload based on role
    const payload =
      role === 'ambulance'
        ? {
            id: user._id,
            ambulanceId: user.ambulanceId,
            name: user.driverName,
            username: user.username,
            vehicleNumber: user.vehicleNumber,
            role: 'ambulance',
          }
        : {
            id: user._id,
            policeId: user.policeId,
            name: user.officerName,
            username: user.username,
            assignedJunctionId: user.assignedJunctionId,
            role: 'police',
          };

    res.status(200).json({ success: true, token, user: payload });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
