// נתיבי ניהול מודעות
const express = require('express');
const router = express.Router();
const { getAllAnnouncements, addAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// קבלת כל המודעות - כל המשתמשים המחוברים
router.get('/all', verifyToken, getAllAnnouncements);

// הוספת מודעה - מנהל בלבד
router.post('/add', verifyToken, authorizeRoles('manager'), addAnnouncement);

// מחיקת מודעה - מנהל בלבד
router.delete('/delete/:id', verifyToken, authorizeRoles('manager'), deleteAnnouncement);

module.exports = router;