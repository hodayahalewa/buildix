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
  replyToMessage,
  forgotPassword,
  changePassword
} = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// הרשמה
router.post('/register', register);

// התחברות
router.post('/login', login);

// שכחתי סיסמה
router.post('/forgot-password', forgotPassword);

// קבלת משתמשים ממתינים
router.get('/pending', verifyToken, authorizeRoles('manager'), getPendingUsers);

// אישור/דחיית משתמש
router.put('/approve', verifyToken, authorizeRoles('manager'), approveUser);

// קבלת כל הטכנאים
router.get('/technicians', verifyToken, authorizeRoles('manager'), getTechnicians);

// קבלת כל המשתמשים
router.get('/all-users', verifyToken, authorizeRoles('manager'), getAllUsers);

// שליחת הודעה
router.post('/send-message', verifyToken, authorizeRoles('manager'), sendMessageToUser);

// קבלת הודעות
router.get('/my-messages', verifyToken, getMyMessages);

// סימון כנקראה
router.put('/messages/read/:id', verifyToken, markMessageRead);

// תשובה להודעה
router.post('/messages/reply', verifyToken, replyToMessage);

router.post('/change-password', verifyToken, changePassword);


module.exports = router;