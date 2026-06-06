// Police controller — full implementation in Phase 8
const Junction = require('../models/Junction');
const EmergencyAlert = require('../models/EmergencyAlert');

const getMyJunction = async (req, res, next) => {
  try {
    const junction = await Junction.findOne({ assignedPoliceId: req.user.policeId });
    res.status(200).json({ success: true, junction });
  } catch (err) { next(err); }
};

const getPoliceAlerts = async (req, res, next) => {
  try {
    const alerts = await EmergencyAlert.find({
      'notifiedPolice.policeId': req.user.policeId,
      status: { $in: ['active', 'en_route'] },
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (err) { next(err); }
};

const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(
      req.params.alertId,
      {
        $set: {
          'notifiedPolice.$[elem].acknowledged': true,
          'notifiedPolice.$[elem].acknowledgedAt': new Date(),
        },
      },
      {
        arrayFilters: [{ 'elem.policeId': req.user.policeId }],
        new: true,
      }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.status(200).json({ success: true, message: 'Alert acknowledged.', alert });
  } catch (err) { next(err); }
  
};

const clearRoute = async (req, res, next) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(
      req.params.alertId,
      {
        $set: {
          'notifiedPolice.$[elem].cleared': true,
          'notifiedPolice.$[elem].clearedAt': new Date(),
        },
      },
      {
        arrayFilters: [{ 'elem.policeId': req.user.policeId }],
        new: true,
      }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    res.status(200).json({ success: true, message: 'Route marked as cleared.', alert });
  } catch (err) { next(err); }
};

module.exports = { getPoliceAlerts, acknowledgeAlert, clearRoute, getMyJunction };
