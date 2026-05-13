// נתיבי ניהול תקלות
const express = require('express');
const router = express.Router();
const {
  reportFault,
  getAllFaults,
  getMyFaults,
  getAssignedFaults,
  assignFault,
  updateFaultStatus,
  getFaultUpdates
} = require('../controllers/faultController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// דיווח תקלה חדשה - דייר, טכנאי ומנהל
router.post('/report', verifyToken, authorizeRoles('tenant', 'technician', 'manager'), reportFault);

// קבלת כל התקלות - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAllFaults);

// קבלת התקלות האישיות - דייר בלבד
router.get('/my', verifyToken, authorizeRoles('tenant'), getMyFaults);

// קבלת התקלות המוקצות - טכנאי בלבד
router.get('/assigned', verifyToken, authorizeRoles('technician'), getAssignedFaults);

// שיוך תקלה לטכנאי - מנהל בלבד
router.put('/assign', verifyToken, authorizeRoles('manager'), assignFault);

// עדכון סטטוס תקלה - טכנאי ומנהל
router.put('/status', verifyToken, authorizeRoles('technician', 'manager'), updateFaultStatus);

// קבלת היסטוריית עדכונים של תקלה
router.get('/updates/:id', verifyToken, authorizeRoles('manager'), getFaultUpdates);
module.exports = router;