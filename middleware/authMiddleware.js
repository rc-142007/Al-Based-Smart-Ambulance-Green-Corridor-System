const jwt = require('jsonwebtoken');
const Ambulance = require('../models/Ambulance');
const Police = require('../models/Police');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    // Attach user document to request
    if (decoded.role === 'ambulance') {
      req.user = await Ambulance.findById(decoded.id);
    } else if (decoded.role === 'police') {
      req.user = await Police.findById(decoded.id);
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

// Role-based access middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.userRole}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
