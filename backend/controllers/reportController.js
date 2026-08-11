const db = require('../config/DB');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ייצוא חשבוניות ל-Excel
const exportInvoicesExcel = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, u.full_name AS technician_name, f.title AS fault_title
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      ORDER BY i.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('חשבוניות');

    sheet.columns = [
      { header: 'מספר', key: 'id', width: 10 },
      { header: 'תקלה', key: 'fault_title', width: 25 },
      { header: 'טכנאי', key: 'technician_name', width: 20 },
      { header: 'סכום', key: 'amount', width: 15 },
      { header: 'תיאור', key: 'description', width: 30 },
      { header: 'סטטוס', key: 'status', width: 15 },
      { header: 'תאריך', key: 'created_at', width: 20 },
    ];

    invoices.forEach(inv => sheet.addRow(inv));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export invoices excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ייצוא חשבוניות ל-PDF
const exportInvoicesPDF = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, u.full_name AS technician_name, f.title AS fault_title
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      ORDER BY i.created_at DESC
    `);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('BUILDIX - דוח חשבוניות', { align: 'center' });
    doc.moveDown();

    invoices.forEach(inv => {
      doc.fontSize(12).text(`#${inv.id} | ${inv.fault_title || 'N/A'} | ${inv.technician_name || 'N/A'} | ${inv.amount || 0} ₪ | ${inv.status}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Export invoices PDF error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ייצוא אנרגיה ל-Excel
const exportEnergyExcel = async (req, res) => {
  try {
    const [energy] = await db.query('SELECT * FROM energy ORDER BY created_at DESC');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('אנרגיה');

    sheet.columns = [
      { header: 'מספר', key: 'id', width: 10 },
      { header: 'סוג', key: 'type', width: 15 },
      { header: 'קריאה', key: 'reading', width: 15 },
      { header: 'חודש', key: 'month', width: 15 },
      { header: 'תאריך', key: 'created_at', width: 20 },
    ];

    energy.forEach(e => sheet.addRow(e));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=energy.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export energy excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ייצוא אנרגיה ל-PDF
const exportEnergyPDF = async (req, res) => {
  try {
    const [energy] = await db.query('SELECT * FROM energy ORDER BY created_at DESC');

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=energy.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('BUILDIX - דוח אנרגיה', { align: 'center' });
    doc.moveDown();

    energy.forEach(e => {
      doc.fontSize(12).text(`#${e.id} | ${e.type} | קריאה: ${e.reading} | חודש: ${e.month}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Export energy PDF error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ייצוא דוח חודשי ל-Excel
const exportMonthlyExcel = async (req, res) => {
  try {
    const [faults] = await db.query('SELECT * FROM faults ORDER BY created_at DESC');
    const [invoices] = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    const [energy] = await db.query('SELECT * FROM energy ORDER BY created_at DESC');
    const [maintenance] = await db.query('SELECT * FROM maintenance ORDER BY created_at DESC');

    const workbook = new ExcelJS.Workbook();

    // גיליון תקלות
    const faultsSheet = workbook.addWorksheet('תקלות');
    faultsSheet.columns = [
      { header: 'מספר', key: 'id', width: 10 },
      { header: 'כותרת', key: 'title', width: 25 },
      { header: 'סטטוס', key: 'status', width: 15 },
      { header: 'דחיפות', key: 'urgency', width: 15 },
      { header: 'תאריך', key: 'created_at', width: 20 },
    ];
    faults.forEach(f => faultsSheet.addRow(f));

    // גיליון חשבוניות
    const invSheet = workbook.addWorksheet('חשבוניות');
    invSheet.columns = [
      { header: 'מספר', key: 'id', width: 10 },
      { header: 'סכום', key: 'amount', width: 15 },
      { header: 'סטטוס', key: 'status', width: 15 },
      { header: 'תאריך', key: 'created_at', width: 20 },
    ];
    invoices.forEach(i => invSheet.addRow(i));

    // גיליון אנרגיה
    const energySheet = workbook.addWorksheet('אנרגיה');
    energySheet.columns = [
      { header: 'סוג', key: 'type', width: 15 },
      { header: 'קריאה', key: 'reading', width: 15 },
      { header: 'חודש', key: 'month', width: 15 },
    ];
    energy.forEach(e => energySheet.addRow(e));

    // גיליון תחזוקה
    const mainSheet = workbook.addWorksheet('תחזוקה');
    mainSheet.columns = [
      { header: 'כותרת', key: 'title', width: 25 },
      { header: 'סטטוס', key: 'status', width: 15 },
      { header: 'תאריך הבא', key: 'next_date', width: 20 },
    ];
    maintenance.forEach(m => mainSheet.addRow(m));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=monthly-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export monthly excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  exportInvoicesExcel,
  exportInvoicesPDF,
  exportEnergyExcel,
  exportEnergyPDF,
  exportMonthlyExcel
};