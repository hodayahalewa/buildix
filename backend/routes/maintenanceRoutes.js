// נתיבי ניהול תחזוקה מונעת
const express = require('express');
const router = express.Router();
const { getAllMaintenance, addMaintenance, markDone } = require('../controllers/maintenanceController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// קבלת כל משימות התחזוקה - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAllMaintenance);

// הוספת משימת תחזוקה - מנהל בלבד
router.post('/add', verifyToken, authorizeRoles('manager'), addMaintenance);

// סימון משימה כבוצעה - מנהל בלבד
router.put('/done', verifyToken, authorizeRoles('manager'), markDone);

module.exports = router;