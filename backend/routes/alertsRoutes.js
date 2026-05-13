// נתיבי התראות מערכת
const express = require('express');
const router = express.Router();
const { getAlerts, confirmMaintenanceDone } = require('../controllers/alertsController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// קבלת כל ההתראות - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAlerts);

// אישור ביצוע משימת תחזוקה מתוך ההתראה
router.put('/confirm-maintenance', verifyToken, authorizeRoles('manager'), confirmMaintenanceDone);

module.exports = router;