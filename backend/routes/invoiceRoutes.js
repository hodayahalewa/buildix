// נתיבי ניהול חשבוניות
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadInvoice, getAllInvoices, getMyInvoices, reviewInvoice } = require('../controllers/invoiceController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// הגדרת multer לשמירת קבצים
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `invoice_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// העלאת חשבונית - טכנאי בלבד
router.post('/upload', verifyToken, authorizeRoles('technician'), upload.single('invoice'), uploadInvoice);

// קבלת כל החשבוניות - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAllInvoices);

// קבלת חשבוניות הטכנאי המחובר
router.get('/my', verifyToken, authorizeRoles('technician'), getMyInvoices);

// אישור/דחיית חשבונית - מנהל בלבד
router.put('/review/:id', verifyToken, authorizeRoles('manager'), reviewInvoice);

module.exports = router;