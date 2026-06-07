// קונטרולר לניהול דוחות
const db = require('../config/DB');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// דוח חשבוניות - Excel
const exportInvoicesExcel = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    let query = `
      SELECT 
        i.id,
        f.title AS fault_title,
        f.fault_type,
        f.floor,
        f.unit_number,
        u.full_name AS technician_name,
        i.amount,
        i.description,
        i.status,
        i.manager_note,
        i.created_at
      FROM invoices i
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query += ' AND i.created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND i.created_at <= ?';
      params.push(to_date + ' 23:59:59');
    }

    query += ' ORDER BY i.created_at DESC';

    const [invoices] = await db.query(query, params);

    // יצירת קובץ Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';
    const sheet = workbook.addWorksheet('חשבוניות');

    // כיוון RTL
    sheet.views = [{ rightToLeft: true }];

    // כותרות עמודות
    sheet.columns = [
      { header: '#', key: 'id', width: 8 },
      { header: 'תקלה', key: 'fault_title', width: 25 },
      { header: 'סוג תקלה', key: 'fault_type', width: 15 },
      { header: 'קומה', key: 'floor', width: 10 },
      { header: 'יחידה', key: 'unit_number', width: 10 },
      { header: 'טכנאי', key: 'technician_name', width: 20 },
      { header: 'סכום (₪)', key: 'amount', width: 12 },
      { header: 'תיאור עבודה', key: 'description', width: 30 },
      { header: 'סטטוס', key: 'status', width: 12 },
      { header: 'הערת מנהל', key: 'manager_note', width: 25 },
      { header: 'תאריך', key: 'created_at', width: 15 }
    ];

    // עיצוב כותרות
    sheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1a3a6b' }
    };
    sheet.getRow(1).alignment = { horizontal: 'center' };

    // הוספת נתונים
    const statusMap = { pending: 'ממתין', approved: 'אושר', rejected: 'נדחה' };
    invoices.forEach(inv => {
      const row = sheet.addRow({
        id: inv.id,
        fault_title: inv.fault_title || 'N/A',
        fault_type: inv.fault_type || 'N/A',
        floor: inv.floor || 'N/A',
        unit_number: inv.unit_number || 'N/A',
        technician_name: inv.technician_name || 'N/A',
        amount: inv.amount ? parseFloat(inv.amount) : 0,
        description: inv.description || '',
        status: statusMap[inv.status] || inv.status,
        manager_note: inv.manager_note || '',
        created_at: new Date(inv.created_at).toLocaleDateString('he-IL')
      });

      // צביעת שורות לפי סטטוס
      if (inv.status === 'approved') {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
      } else if (inv.status === 'rejected') {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } };
      } else {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef3c7' } };
      }
    });

    // שורת סיכום
    const totalApproved = invoices
      .filter(i => i.status === 'approved' && i.amount)
      .reduce((sum, i) => sum + parseFloat(i.amount), 0);

    sheet.addRow({});
    const summaryRow = sheet.addRow({
      fault_title: 'סה"כ מאושר:',
      amount: totalApproved
    });
    summaryRow.font = { bold: true, size: 12 };
    summaryRow.getCell('amount').fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFd1fae5' }
    };

    // שליחת הקובץ
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=invoices_report_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export invoices Excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// דוח חשבוניות - PDF
const exportInvoicesPDF = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    let query = `
      SELECT i.*, f.title AS fault_title, f.fault_type, f.floor,
        u.full_name AS technician_name
      FROM invoices i
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (from_date) { query += ' AND i.created_at >= ?'; params.push(from_date); }
    if (to_date) { query += ' AND i.created_at <= ?'; params.push(to_date + ' 23:59:59'); }
    query += ' ORDER BY i.created_at DESC';

    const [invoices] = await db.query(query, params);

    const totalApproved = invoices
      .filter(i => i.status === 'approved' && i.amount)
      .reduce((sum, i) => sum + parseFloat(i.amount), 0);

    // יצירת PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoices_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // כותרת
    doc.fontSize(20).text('BUILDIX - דוח חשבוניות', { align: 'center' });
    doc.fontSize(12).text(`תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`, { align: 'center' });
    if (from_date || to_date) {
      doc.text(`תקופה: ${from_date || 'תחילת זמן'} עד ${to_date || 'היום'}`, { align: 'center' });
    }
    doc.moveDown();

    // סיכום
    doc.fontSize(14).text(`סה"כ חשבוניות: ${invoices.length}`, { align: 'right' });
    doc.text(`סה"כ מאושר: ₪${totalApproved.toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();

    // רשימת חשבוניות
    const statusMap = { pending: 'ממתין', approved: 'אושר', rejected: 'נדחה' };
    invoices.forEach((inv, index) => {
      doc.fontSize(11).text(
        `${index + 1}. תקלה: ${inv.fault_title || 'N/A'} | טכנאי: ${inv.technician_name || 'N/A'}`,
        { align: 'right' }
      );
      doc.fontSize(10).text(
        `   סכום: ₪${inv.amount || 0} | סטטוס: ${statusMap[inv.status]} | תאריך: ${new Date(inv.created_at).toLocaleDateString('he-IL')}`,
        { align: 'right' }
      );
      if (inv.description) {
        doc.fontSize(9).text(`   תיאור: ${inv.description}`, { align: 'right' });
      }
      doc.moveDown(0.5);

      // עמוד חדש אם צריך
      if (doc.y > 700) doc.addPage();
    });

    doc.end();

  } catch (err) {
    console.error('Export invoices PDF error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// דוח אנרגיה - Excel
const exportEnergyExcel = async (req, res) => {
  try {
    const { from_month, to_month } = req.query;

    let query = 'SELECT * FROM energy WHERE 1=1';
    const params = [];
    if (from_month) { query += ' AND month >= ?'; params.push(from_month); }
    if (to_month) { query += ' AND month <= ?'; params.push(to_month); }
    query += ' ORDER BY month ASC, type ASC';

    const [readings] = await db.query(query, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';

    // גיליון חשמל
    const elecSheet = workbook.addWorksheet('חשמל');
    elecSheet.views = [{ rightToLeft: true }];
    elecSheet.columns = [
      { header: 'חודש', key: 'month', width: 15 },
      { header: 'קריאה (קוט"ש)', key: 'reading', width: 18 },
      { header: 'תאריך הזנה', key: 'created_at', width: 15 }
    ];
    elecSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    elecSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf59e0b' } };

    // גיליון מים
    const waterSheet = workbook.addWorksheet('מים');
    waterSheet.views = [{ rightToLeft: true }];
    waterSheet.columns = [
      { header: 'חודש', key: 'month', width: 15 },
      { header: 'קריאה (מ"ק)', key: 'reading', width: 15 },
      { header: 'תאריך הזנה', key: 'created_at', width: 15 }
    ];
    waterSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    waterSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };

    readings.forEach(r => {
      const row = {
        month: r.month,
        reading: parseFloat(r.reading),
        created_at: new Date(r.created_at).toLocaleDateString('he-IL')
      };
      if (r.type === 'electricity') elecSheet.addRow(row);
      else waterSheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=energy_report_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export energy Excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// דוח אנרגיה - PDF
const exportEnergyPDF = async (req, res) => {
  try {
    const { from_month, to_month } = req.query;

    let query = 'SELECT * FROM energy WHERE 1=1';
    const params = [];
    if (from_month) { query += ' AND month >= ?'; params.push(from_month); }
    if (to_month) { query += ' AND month <= ?'; params.push(to_month); }
    query += ' ORDER BY month ASC, type ASC';

    const [readings] = await db.query(query, params);

    const electricity = readings.filter(r => r.type === 'electricity');
    const water = readings.filter(r => r.type === 'water');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=energy_report_${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('BUILDIX - דוח צריכת אנרגיה', { align: 'center' });
    doc.fontSize(12).text(`תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`, { align: 'center' });
    if (from_month || to_month) {
      doc.text(`תקופה: ${from_month || 'תחילת זמן'} עד ${to_month || 'היום'}`, { align: 'center' });
    }
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();

    // חשמל
    doc.fontSize(14).text('⚡ צריכת חשמל', { align: 'right' });
    doc.moveDown(0.5);
    electricity.forEach(r => {
      doc.fontSize(11).text(
        `${r.month}: ${parseFloat(r.reading).toLocaleString()} קוט"ש`,
        { align: 'right' }
      );
    });
    if (electricity.length === 0) doc.fontSize(11).text('אין נתונים', { align: 'right' });

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();

    // מים
    doc.fontSize(14).text('💧 צריכת מים', { align: 'right' });
    doc.moveDown(0.5);
    water.forEach(r => {
      doc.fontSize(11).text(
        `${r.month}: ${parseFloat(r.reading).toLocaleString()} מ"ק`,
        { align: 'right' }
      );
    });
    if (water.length === 0) doc.fontSize(11).text('אין נתונים', { align: 'right' });

    doc.end();

  } catch (err) {
    console.error('Export energy PDF error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// דוח חודשי כולל - Excel
const exportMonthlyExcel = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month required.' });

    const fromDate = `${month}-01`;
    const toDate = `${month}-31`;

    // חשבוניות החודש
    const [invoices] = await db.query(`
      SELECT i.*, f.title AS fault_title, f.fault_type,
        u.full_name AS technician_name
      FROM invoices i
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users u ON i.technician_id = u.id
      WHERE i.created_at >= ? AND i.created_at <= ?
      ORDER BY i.created_at DESC
    `, [fromDate, toDate + ' 23:59:59']);

    // תקלות החודש
    const [faults] = await db.query(`
      SELECT f.*, u1.full_name AS reported_by_name, u2.full_name AS assigned_to_name
      FROM faults f
      LEFT JOIN users u1 ON f.reported_by = u1.id
      LEFT JOIN users u2 ON f.assigned_to = u2.id
      WHERE f.created_at >= ? AND f.created_at <= ?
      ORDER BY f.created_at DESC
    `, [fromDate, toDate + ' 23:59:59']);

    // אנרגיה החודש
    const [energy] = await db.query('SELECT * FROM energy WHERE month = ?', [month]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';

    // ===== גיליון סיכום =====
    const summarySheet = workbook.addWorksheet('סיכום חודשי');
    summarySheet.views = [{ rightToLeft: true }];

    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = `BUILDIX - דוח חודשי ${month}`;
    summarySheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a6b' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    summarySheet.getRow(1).height = 30;

    summarySheet.addRow([]);
    summarySheet.addRow(['סה"כ תקלות', faults.length]);
    summarySheet.addRow(['תקלות סגורות', faults.filter(f => f.status === 'closed').length]);
    summarySheet.addRow(['תקלות פתוחות', faults.filter(f => f.status !== 'closed').length]);
    summarySheet.addRow([]);
    summarySheet.addRow(['סה"כ חשבוניות', invoices.length]);
    summarySheet.addRow(['חשבוניות מאושרות', invoices.filter(i => i.status === 'approved').length]);

    const totalApproved = invoices
      .filter(i => i.status === 'approved' && i.amount)
      .reduce((sum, i) => sum + parseFloat(i.amount), 0);
    summarySheet.addRow(['סה"כ הוצאות מאושרות (₪)', totalApproved]);
    summarySheet.addRow([]);

    const elec = energy.find(e => e.type === 'electricity');
    const water = energy.find(e => e.type === 'water');
    summarySheet.addRow(['חשמל (קוט"ש)', elec ? parseFloat(elec.reading) : 'לא הוזן']);
    summarySheet.addRow(['מים (מ"ק)', water ? parseFloat(water.reading) : 'לא הוזן']);

    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 20;

    // ===== גיליון תקלות =====
    const faultsSheet = workbook.addWorksheet('תקלות');
    faultsSheet.views = [{ rightToLeft: true }];
    faultsSheet.columns = [
      { header: '#', key: 'id', width: 8 },
      { header: 'כותרת', key: 'title', width: 25 },
      { header: 'סוג', key: 'fault_type', width: 15 },
      { header: 'דחיפות', key: 'urgency', width: 12 },
      { header: 'סטטוס', key: 'status', width: 12 },
      { header: 'טכנאי', key: 'assigned_to_name', width: 20 },
      { header: 'מדווח', key: 'reported_by_name', width: 20 },
      { header: 'תאריך', key: 'created_at', width: 15 }
    ];
    faultsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    faultsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a6b' } };

    const urgencyMap = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };
    const statusMap = { open: 'פתוח', in_progress: 'בטיפול', waiting_part: 'ממתין לחלק', closed: 'סגור' };
    faults.forEach(f => {
      faultsSheet.addRow({
        id: f.id,
        title: f.title,
        fault_type: f.fault_type,
        urgency: urgencyMap[f.urgency] || f.urgency,
        status: statusMap[f.status] || f.status,
        assigned_to_name: f.assigned_to_name || 'לא הוקצה',
        reported_by_name: f.reported_by_name || 'N/A',
        created_at: new Date(f.created_at).toLocaleDateString('he-IL')
      });
    });

    // ===== גיליון חשבוניות =====
    const invSheet = workbook.addWorksheet('חשבוניות');
    invSheet.views = [{ rightToLeft: true }];
    invSheet.columns = [
      { header: '#', key: 'id', width: 8 },
      { header: 'תקלה', key: 'fault_title', width: 25 },
      { header: 'טכנאי', key: 'technician_name', width: 20 },
      { header: 'סכום (₪)', key: 'amount', width: 12 },
      { header: 'תיאור', key: 'description', width: 30 },
      { header: 'סטטוס', key: 'status', width: 12 },
      { header: 'תאריך', key: 'created_at', width: 15 }
    ];
    invSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    invSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a6b' } };

    const invStatusMap = { pending: 'ממתין', approved: 'אושר', rejected: 'נדחה' };
    invoices.forEach(inv => {
      invSheet.addRow({
        id: inv.id,
        fault_title: inv.fault_title || 'N/A',
        technician_name: inv.technician_name || 'N/A',
        amount: inv.amount ? parseFloat(inv.amount) : 0,
        description: inv.description || '',
        status: invStatusMap[inv.status] || inv.status,
        created_at: new Date(inv.created_at).toLocaleDateString('he-IL')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_report_${month}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export monthly Excel error:', err.message);
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