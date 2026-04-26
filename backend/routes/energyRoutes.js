// נתיבי ניהול מדידות אנרגיה
const express = require('express');
const router = express.Router();
const { getAllReadings, addReading } = require('../controllers/energyController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// קבלת כל המדידות - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAllReadings);

// הוספת מדידה חדשה - מנהל בלבד
router.post('/add', verifyToken, authorizeRoles('manager'), addReading);

module.exports = router;