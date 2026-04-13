// נתיבי הרשמה, התחברות וניהול משתמשים
const express = require('express');
const router = express.Router();
const { register, login, getPendingUsers, approveUser, getTechnicians } = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// נתיב הרשמה - POST /api/auth/register
router.post('/register', register);

// נתיב התחברות - POST /api/auth/login
router.post('/login', login);

// קבלת משתמשים ממתינים לאישור - מנהל בלבד
router.get('/pending', verifyToken, authorizeRoles('manager'), getPendingUsers);

// אישור או דחיית משתמש - מנהל בלבד
router.put('/approve', verifyToken, authorizeRoles('manager'), approveUser);

// קבלת כל הטכנאים - מנהל בלבד
router.get('/technicians', verifyToken, authorizeRoles('manager'), getTechnicians);

module.exports = router;