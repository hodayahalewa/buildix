// נתיבי דוחות
const express = require('express');
const router = express.Router();
const {
  exportInvoicesExcel,
  exportInvoicesPDF,
  exportEnergyExcel,
  exportEnergyPDF,
  exportMonthlyExcel
} = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// middleware מיוחד שמקבל טוקן גם מ-URL וגם מ-header
const verifyTokenFromQuery = (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return verifyToken(req, res, next);
};

// דוח חשבוניות
router.get('/invoices/excel', verifyTokenFromQuery, authorizeRoles('manager'), exportInvoicesExcel);
router.get('/invoices/pdf', verifyTokenFromQuery, authorizeRoles('manager'), exportInvoicesPDF);

// דוח אנרגיה
router.get('/energy/excel', verifyTokenFromQuery, authorizeRoles('manager'), exportEnergyExcel);
router.get('/energy/pdf', verifyTokenFromQuery, authorizeRoles('manager'), exportEnergyPDF);

// דוח חודשי כולל
router.get('/monthly/excel', verifyTokenFromQuery, authorizeRoles('manager'), exportMonthlyExcel);

module.exports = router;