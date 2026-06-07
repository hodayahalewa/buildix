// נתיבי הרשמה, התחברות וניהול משתמשים
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getPendingUsers,
  approveUser,
  getTechnicians,
  getAllUsers,
  sendMessageToUser,
  getMyMessages,
  markMessageRead,
  replyToMessage
} = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// הרשמה
router.post('/register', register);

// התחברות
router.post('/login', login);

// קבלת משתמשים ממתינים - מנהל בלבד
router.get('/pending', verifyToken, authorizeRoles('manager'), getPendingUsers);

// אישור/דחיית משתמש - מנהל בלבד
router.put('/approve', verifyToken, authorizeRoles('manager'), approveUser);

// קבלת כל הטכנאים - מנהל בלבד
router.get('/technicians', verifyToken, authorizeRoles('manager'), getTechnicians);

// קבלת כל המשתמשים - מנהל בלבד
router.get('/all-users', verifyToken, authorizeRoles('manager'), getAllUsers);

// שליחת הודעה למשתמש - מנהל בלבד
router.post('/send-message', verifyToken, authorizeRoles('manager'), sendMessageToUser);

// קבלת הודעות של המשתמש המחובר - כולם
router.get('/my-messages', verifyToken, getMyMessages);

// סימון הודעה כנקראה - כולם
router.put('/messages/read/:id', verifyToken, markMessageRead);

// שליחת תשובה להודעה - כולם
router.post('/messages/reply', verifyToken, replyToMessage);

module.exports = router;