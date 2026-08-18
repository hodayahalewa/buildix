console.log('===== REPORT CONTROLLER LOADED AT:', new Date().toISOString(), '=====');
const db = require('../config/DB');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const HEBREW_FONT_PATH = path.join(__dirname, '..', 'fonts', 'Heebo-Regular.ttf');
const HEBREW_FONT_BOLD_PATH = path.join(__dirname, '..', 'fonts', 'Heebo-Bold.ttf');

const BRAND_BLUE = '#1a3a6b';
const BRAND_GOLD = '#c9a227';
const COLOR_APPROVED = '#10b981';
const COLOR_PENDING = '#f59e0b';
const COLOR_REJECTED = '#ef4444';

// ===================== RTL - פתרון עצמאי מבוסס מילים =====================
const HEBREW_CHAR_REGEX = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

// הופך סדר מילים + הופך אותיות בתוך כל מילה עברית בנפרד
// חשוב: בכל מקום שבו בונים מחרוזת - להשאיר רווח לפני נקודתיים/מספרים הצמודים למילה עברית,
// אחרת הם "נבלעים" לתוך המילה ומתהפכים יחד איתה למקום הלא נכון
function reverseHebrewMixed(str) {
  const s = String(str ?? '');
  if (!s) return '';

  const words = s.split(' ');
  const processedWords = words.map(word => {
    return HEBREW_CHAR_REGEX.test(word) ? [...word].reverse().join('') : word;
  });
  return processedWords.reverse().join(' ');
}

function checkFontExists() {
  if (!fs.existsSync(HEBREW_FONT_PATH)) {
    throw new Error(`Hebrew font not found at: ${HEBREW_FONT_PATH}`);
  }
}

function createPDFDoc(res, filename) {
  checkFontExists();
  const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true, layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  doc.registerFont('Heebo', HEBREW_FONT_PATH);
  if (fs.existsSync(HEBREW_FONT_BOLD_PATH)) {
    doc.registerFont('Heebo-Bold', HEBREW_FONT_BOLD_PATH);
  } else {
    doc.registerFont('Heebo-Bold', HEBREW_FONT_PATH);
  }
  doc.font('Heebo');
  return doc;
}

function hebrewText(doc, text, x, y, options = {}) {
  const visualText = reverseHebrewMixed(text);
  doc.text(visualText, x, y, {
    width: options.width,
    align: options.align || 'right',
    lineBreak: false
  });
}

function drawReportHeader(doc, title, subtitle) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerHeight = 70;

  doc.rect(doc.page.margins.left, doc.y, pageWidth, headerHeight).fill(BRAND_BLUE);

  const logoX = doc.page.margins.left + pageWidth - 55;
  const logoY = doc.y + headerHeight / 2;
  doc.circle(logoX, logoY, 20).fill(BRAND_GOLD);
  doc.font('Heebo-Bold').fontSize(18).fillColor(BRAND_BLUE);
  doc.text('B', logoX - 7, logoY - 9, { width: 14, align: 'center', lineBreak: false });

  doc.fillColor('white').font('Heebo-Bold').fontSize(20);
  hebrewText(doc, 'BUILDIX', doc.page.margins.left + 20, doc.y + 12, { width: pageWidth - 95, align: 'right' });

  doc.font('Heebo-Bold').fontSize(12).fillColor(BRAND_GOLD);
  hebrewText(doc, title, doc.page.margins.left + 20, doc.y + 42, { width: pageWidth - 95, align: 'right' });

  doc.y += headerHeight;
  doc.moveDown(0.6);

  doc.fillColor('#6b7280').fontSize(9.5);
  const dateStr = new Date().toLocaleDateString('he-IL');
  // רווח לפני הנקודתיים - כדי שלא "יבלעו" לתוך המילה בהיפוך
  hebrewText(doc, `${subtitle}   |   הופק בתאריך : ${dateStr}`, doc.page.margins.left, doc.y, { width: pageWidth, align: 'right' });
  doc.moveDown(1);
  doc.fillColor('#000000');
}

function drawPieChart(doc, centerX, centerY, radius, slices) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let startAngle = -Math.PI / 2;

  slices.forEach(slice => {
    if (slice.value <= 0) return;
    const sweep = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;
    const steps = Math.max(2, Math.ceil((sweep / (Math.PI * 2)) * 120));

    doc.moveTo(centerX, centerY);
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (sweep * i / steps);
      doc.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
    }
    doc.closePath();
    doc.fill(slice.color);

    startAngle = endAngle;
  });

  doc.circle(centerX, centerY, radius * 0.55).fill('#ffffff');
  doc.font('Heebo-Bold').fontSize(16).fillColor(BRAND_BLUE);
  hebrewText(doc, String(total), centerX - 35, centerY - 10, { width: 70, align: 'center' });
  doc.font('Heebo').fontSize(7).fillColor('#9ca3af');
  hebrewText(doc, 'סה"כ חשבוניות', centerX - 50, centerY + 9, { width: 100, align: 'center' });
}

function drawPieLegend(doc, x, y, width, slices) {
  let curY = y;
  slices.forEach(slice => {
    doc.rect(x, curY + 2, 12, 12).fill(slice.color);
    doc.font('Heebo-Bold').fontSize(10).fillColor('#1f2937');
    // רווח לפני הנקודתיים
    hebrewText(doc, `${slice.label} : ${slice.value}`, x + 18, curY, { width: width - 18, align: 'right' });
    curY += 24;
  });
}

function drawHorizontalBar(doc, x, y, width, value, maxValue, color, label, valueLabel) {
  const barHeight = 18;
  doc.font('Heebo-Bold').fontSize(10).fillColor('#1f2937');
  // רווח לפני הנקודתיים
  hebrewText(doc, `${label} : ${valueLabel}`, x, y - 15, { width, align: 'right' });

  doc.rect(x, y, width, barHeight).fill('#eef0f8');
  const fillWidth = maxValue > 0 ? Math.max(3, (value / maxValue) * width) : 0;
  doc.rect(x, y, fillWidth, barHeight).fill(color);
}

function drawVisualSummary(doc, invoices) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 165;
  const boxY = doc.y;
  const boxX = doc.page.margins.left;

  doc.rect(boxX, boxY, pageWidth, boxHeight).fill('#f8f9ff').strokeColor('#e2e5f5').lineWidth(1).stroke();

  const approved = invoices.filter(i => i.status === 'approved');
  const pending = invoices.filter(i => i.status === 'pending');
  const rejected = invoices.filter(i => i.status === 'rejected');
  const approvedSum = approved.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const pendingSum = pending.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  doc.font('Heebo-Bold').fontSize(13).fillColor(BRAND_BLUE);
  hebrewText(doc, 'תמונת מצב כללית', boxX + 18, boxY + 14, { width: pageWidth - 36, align: 'right' });

  const pieRadius = 38;
  const pieCenterX = boxX + pageWidth - 65;
  const pieCenterY = boxY + 100;

  const legendWidth = 120;
  const legendX = pieCenterX - pieRadius - 18 - legendWidth;

  drawPieChart(doc, pieCenterX, pieCenterY, pieRadius, [
    { label: 'אושרו', value: approved.length, color: COLOR_APPROVED },
    { label: 'ממתינות', value: pending.length, color: COLOR_PENDING },
    { label: 'נדחו', value: rejected.length, color: COLOR_REJECTED },
  ]);

  drawPieLegend(doc, legendX, boxY + 55, legendWidth, [
    { label: 'אושרו', value: approved.length, color: COLOR_APPROVED },
    { label: 'ממתינות', value: pending.length, color: COLOR_PENDING },
    { label: 'נדחו', value: rejected.length, color: COLOR_REJECTED },
  ]);

  const barX = boxX + 22;
  const barWidth = legendX - barX - 26;
  const maxAmount = Math.max(approvedSum, pendingSum, 1);

  drawHorizontalBar(doc, barX, boxY + 55, barWidth, approvedSum, maxAmount, COLOR_APPROVED, 'סכום מאושר', formatCurrency(approvedSum));
  drawHorizontalBar(doc, barX, boxY + 100, barWidth, pendingSum, maxAmount, COLOR_PENDING, 'סכום ממתין', formatCurrency(pendingSum));

  doc.font('Heebo-Bold').fontSize(10).fillColor('#374151');
  // רווח לפני כל נקודתיים כאן גם
  const kpiLine = `סה"כ ${invoices.length} חשבוניות   |   ${rejected.length} נדחו   |   ממוצע לחשבונית מאושרת : ${approved.length ? formatCurrency(approvedSum / approved.length) : '-'}`;
  hebrewText(doc, kpiLine, barX, boxY + 138, { width: pageWidth - 44, align: 'right' });

  doc.y = boxY + boxHeight + 15;
  doc.fillColor('#000000');
}

function drawTable(doc, columns, rows, options = {}) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = options.rowHeight || 28;
  const headerRowHeight = 30;
  const rightEdge = doc.page.margins.left + pageWidth;

  let cursorX = rightEdge;
  const colPositions = columns.map(col => {
    cursorX -= col.width;
    return { ...col, x: cursorX };
  });

  function drawHeaderRow() {
    const y = doc.y;
    doc.rect(doc.page.margins.left, y, pageWidth, headerRowHeight).fill(BRAND_BLUE);
    doc.font('Heebo-Bold').fontSize(10).fillColor('white');
    colPositions.forEach(col => {
      hebrewText(doc, col.label, col.x + 6, y + 9, { width: col.width - 12, align: col.align || 'right' });
    });
    doc.y = y + headerRowHeight;
    doc.fillColor('#000000');
  }

  function checkPageBreak() {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 25) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      drawHeaderRow();
    }
  }

  drawHeaderRow();

  rows.forEach((row, idx) => {
    checkPageBreak();
    const y = doc.y;

    if (idx % 2 === 0) {
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#f8f9ff');
      doc.fillColor('#000000');
    }

    doc.font('Heebo').fontSize(9.5).fillColor('#1f2937');
    colPositions.forEach(col => {
      const rawVal = row[col.key];
      const val = col.format ? col.format(rawVal, row) : (rawVal ?? '');
      hebrewText(doc, val, col.x + 6, y + 8, { width: col.width - 12, align: col.align || 'right' });
    });

    doc.moveTo(doc.page.margins.left, y + rowHeight)
       .lineTo(rightEdge, y + rowHeight)
       .strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    doc.y = y + rowHeight;
  });

  doc.moveDown(1);
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font('Heebo').fontSize(9).fillColor('#9ca3af');
    hebrewText(doc, `BUILDIX  |  עמוד ${i + 1} מתוך ${range.count}`, doc.page.margins.left, doc.page.height - 32, {
      width: pageWidth, align: 'center'
    });
  }
}

function translateStatus(status) {
  const map = { pending: 'ממתין', approved: 'אושר', rejected: 'נדחה' };
  return map[status] || status;
}

function translateFaultStatus(status) {
  const map = { open: 'פתוח', in_progress: 'בטיפול', waiting_part: 'ממתין לחלק', pending_approval: 'ממתין לאישור', closed: 'סגור' };
  return map[status] || status;
}

function translateEnergyType(type) {
  const map = { electricity: 'חשמל', water: 'מים' };
  return map[type] || type;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('he-IL');
}

function formatCurrency(v) {
  if (v === null || v === undefined) return '-';
  return `₪${parseFloat(v).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ===================== עזרי Excel =====================

function styleExcelHeader(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
  });
  headerRow.height = 26;
  sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];
}

function styleExcelDataRows(sheet, startRow = 2) {
  for (let i = startRow; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const isEven = (i - startRow) % 2 === 0;
    row.eachCell(cell => {
      cell.font = { size: 11 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FF' } };
      }
    });
    row.height = 22;
  }
}

// ============================================================
// חשבוניות - Excel
// ============================================================
const exportInvoicesExcel = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT 
        i.*,
        u.full_name AS technician_name,
        u.phone AS technician_phone,
        f.title AS fault_title,
        f.floor AS fault_floor,
        f.unit_number AS fault_unit,
        f.status AS fault_status,
        f.urgency AS fault_urgency,
        f.created_at AS fault_created_at,
        f.closed_at AS fault_closed_at,
        tenant.full_name AS tenant_name,
        tenant.phone AS tenant_phone
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users tenant ON f.reported_by = tenant.id
      ORDER BY i.created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';
    const sheet = workbook.addWorksheet('חשבוניות', { views: [{ rightToLeft: true }] });

    sheet.mergeCells('A1:N1');
    sheet.getCell('A1').value = 'BUILDIX - דוח חשבוניות מפורט';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1A3A6B' } };
    sheet.getCell('A1').alignment = { horizontal: 'right' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:N2');
    sheet.getCell('A2').value = `הופק בתאריך: ${new Date().toLocaleDateString('he-IL')}  |  סה"כ ${invoices.length} חשבוניות`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF6B7280' } };
    sheet.getCell('A2').alignment = { horizontal: 'right' };
    sheet.addRow([]);

    sheet.getRow(4).values = [
      'מספר', 'תקלה', 'קומה', 'יחידה', 'דייר מדווח', 'טלפון דייר', 'סטטוס תקלה',
      'טכנאי', 'סכום (₪)', 'תיאור עבודה', 'סטטוס חשבונית', 'הערת מנהל', 'תאריך הגשה', 'תאריך סגירת תקלה'
    ];
    sheet.columns = [
      { key: 'id', width: 8 },
      { key: 'fault_title', width: 26 },
      { key: 'fault_floor', width: 8 },
      { key: 'fault_unit', width: 8 },
      { key: 'tenant_name', width: 18 },
      { key: 'tenant_phone', width: 14 },
      { key: 'fault_status', width: 14 },
      { key: 'technician_name', width: 18 },
      { key: 'amount', width: 13 },
      { key: 'description', width: 28 },
      { key: 'status', width: 16 },
      { key: 'manager_note', width: 24 },
      { key: 'created_at', width: 14 },
      { key: 'fault_closed_at', width: 16 },
    ];

    const headerRow4 = sheet.getRow(4);
    headerRow4.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    headerRow4.height = 26;
    sheet.views = [{ state: 'frozen', ySplit: 4, rightToLeft: true }];
    sheet.autoFilter = { from: 'A4', to: 'N4' };

    invoices.forEach(inv => {
      sheet.addRow([
        inv.id,
        inv.fault_title || 'לא ידוע',
        inv.fault_floor || '-',
        inv.fault_unit || '-',
        inv.tenant_name || '-',
        inv.tenant_phone || '-',
        translateFaultStatus(inv.fault_status),
        inv.technician_name || 'לא ידוע',
        inv.amount ? parseFloat(inv.amount) : 0,
        inv.description || '',
        translateStatus(inv.status),
        inv.manager_note || '',
        formatDate(inv.created_at),
        formatDate(inv.fault_closed_at)
      ]);
    });

    sheet.getColumn(9).numFmt = '#,##0.00 "₪"';

    for (let i = 5; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const isEven = (i - 5) % 2 === 0;
      row.eachCell(cell => {
        cell.font = { size: 11 };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FF' } };
      });
      row.height = 22;
    }

    const totalApproved = invoices.filter(i => i.status === 'approved').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalRowNum = sheet.rowCount + 1;
    sheet.getRow(totalRowNum).getCell(2).value = 'סה"כ חשבוניות מאושרות:';
    sheet.getRow(totalRowNum).getCell(9).value = totalApproved;
    sheet.getRow(totalRowNum).eachCell(cell => {
      cell.font = { bold: true, size: 12 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3D6' } };
      cell.alignment = { horizontal: 'right' };
    });
    sheet.getCell(`I${totalRowNum}`).numFmt = '#,##0.00 "₪"';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=buildix-invoices-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export invoices excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ============================================================
// חשבוניות - PDF
// ============================================================
const exportInvoicesPDF = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT 
        i.*,
        u.full_name AS technician_name,
        f.title AS fault_title,
        f.floor AS fault_floor,
        f.unit_number AS fault_unit,
        f.status AS fault_status,
        tenant.full_name AS tenant_name
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users tenant ON f.reported_by = tenant.id
      ORDER BY i.created_at DESC
    `);

    const doc = createPDFDoc(res, 'buildix-invoices-report.pdf');
    doc.y = doc.page.margins.top;

    drawReportHeader(doc, 'דוח חשבוניות מפורט', `סה"כ ${invoices.length} חשבוניות במערכת`);

    drawVisualSummary(doc, invoices);

    const columns = [
      { label: '#', key: 'id', width: 32, align: 'center' },
      { label: 'תקלה', key: 'fault_title', width: 140, align: 'right' },
      { label: 'קומה/יח\'', key: 'fault_floor', width: 75, align: 'center', format: (v, row) => `${row.fault_floor || '-'}/${row.fault_unit || '-'}` },
      { label: 'דייר', key: 'tenant_name', width: 85, align: 'right', format: v => v || '-' },
      { label: 'טכנאי', key: 'technician_name', width: 85, align: 'right' },
      { label: 'סכום', key: 'amount', width: 75, align: 'center', format: v => v ? formatCurrency(v) : '-' },
      { label: 'סטטוס תק\'', key: 'fault_status', width: 75, align: 'center', format: v => translateFaultStatus(v) },
      { label: 'סטטוס חשב\'', key: 'status', width: 70, align: 'center', format: v => translateStatus(v) },
      { label: 'תאריך', key: 'created_at', width: 70, align: 'center', format: v => formatDate(v) },
    ];

    drawTable(doc, columns, invoices);

    addPageNumbers(doc);
    doc.end();
  } catch (err) {
    console.error('Export invoices PDF error:', err.message);
    if (!res.headersSent) res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ============================================================
// אנרגיה - Excel
// ============================================================
const exportEnergyExcel = async (req, res) => {
  try {
    const [energy] = await db.query('SELECT * FROM energy ORDER BY month DESC, created_at DESC');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';
    const sheet = workbook.addWorksheet('אנרגיה', { views: [{ rightToLeft: true }] });

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'BUILDIX - דוח צריכת אנרגיה';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1A3A6B' } };
    sheet.getCell('A1').alignment = { horizontal: 'right' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `הופק בתאריך: ${new Date().toLocaleDateString('he-IL')}  |  סה"כ ${energy.length} קריאות`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF6B7280' } };
    sheet.getCell('A2').alignment = { horizontal: 'right' };
    sheet.addRow([]);

    const electricityReadings = energy.filter(e => e.type === 'electricity');
    const waterReadings = energy.filter(e => e.type === 'water');
    const totalElectricity = electricityReadings.reduce((s, e) => s + (parseFloat(e.reading) || 0), 0);
    const totalWater = waterReadings.reduce((s, e) => s + (parseFloat(e.reading) || 0), 0);
    const avgElectricity = electricityReadings.length ? totalElectricity / electricityReadings.length : 0;
    const avgWater = waterReadings.length ? totalWater / waterReadings.length : 0;

    sheet.mergeCells('A4:E4');
    sheet.getCell('A4').value = 'סיכום כולל';
    sheet.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF1A3A6B' } };
    sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
    sheet.getCell('A4').alignment = { horizontal: 'right' };
    sheet.getRow(4).height = 22;

    const summaryRows = [
      [`סה"כ צריכת חשמל: ${totalElectricity.toLocaleString('he-IL')} קוט"ש`, `ממוצע לקריאה: ${avgElectricity.toFixed(1)} קוט"ש`, '', `מספר קריאות: ${electricityReadings.length}`, ''],
      [`סה"כ צריכת מים: ${totalWater.toLocaleString('he-IL')} מ"ק`, `ממוצע לקריאה: ${avgWater.toFixed(1)} מ"ק`, '', `מספר קריאות: ${waterReadings.length}`, ''],
    ];
    summaryRows.forEach(rowData => {
      const r = sheet.addRow(rowData);
      r.eachCell(cell => {
        cell.font = { size: 10.5, color: { argb: 'FF374151' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FF' } };
        cell.alignment = { horizontal: 'right' };
      });
      r.height = 20;
    });
    sheet.addRow([]);

    const headerRowNum = 8;
    sheet.getRow(headerRowNum).values = ['מספר', 'סוג', 'קריאה', 'חודש', 'תאריך עדכון'];
    sheet.columns = [
      { key: 'id', width: 8 },
      { key: 'type', width: 14 },
      { key: 'reading', width: 14 },
      { key: 'month', width: 12 },
      { key: 'created_at', width: 16 },
    ];
    sheet.getRow(headerRowNum).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6B' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    sheet.getRow(headerRowNum).height = 26;
    sheet.views = [{ state: 'frozen', ySplit: headerRowNum, rightToLeft: true }];
    sheet.autoFilter = { from: `A${headerRowNum}`, to: `E${headerRowNum}` };

    energy.forEach(e => {
      sheet.addRow([e.id, translateEnergyType(e.type), e.reading, e.month, formatDate(e.created_at)]);
    });

    for (let i = headerRowNum + 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const isEven = (i - (headerRowNum + 1)) % 2 === 0;
      row.eachCell(cell => {
        cell.font = { size: 11 };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FF' } };
      });
      row.height = 22;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=buildix-energy-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export energy excel error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ============================================================
// אנרגיה - PDF
// ============================================================
const exportEnergyPDF = async (req, res) => {
  try {
    const [energy] = await db.query('SELECT * FROM energy ORDER BY month DESC, created_at DESC');

    const doc = createPDFDoc(res, 'buildix-energy-report.pdf');
    doc.y = doc.page.margins.top;

    drawReportHeader(doc, 'דוח צריכת אנרגיה', `סה"כ ${energy.length} קריאות במערכת`);

    const electricityReadings = energy.filter(e => e.type === 'electricity');
    const waterReadings = energy.filter(e => e.type === 'water');
    const totalElectricity = electricityReadings.reduce((s, e) => s + (parseFloat(e.reading) || 0), 0);
    const totalWater = waterReadings.reduce((s, e) => s + (parseFloat(e.reading) || 0), 0);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const summaryBoxY = doc.y;
    const summaryBoxHeight = 55;
    doc.rect(doc.page.margins.left, summaryBoxY, pageWidth, summaryBoxHeight).fill('#f8f9ff').strokeColor('#e2e5f5').lineWidth(1).stroke();
    doc.font('Heebo-Bold').fontSize(11).fillColor(BRAND_BLUE);
    const summaryLine = `סה"כ צריכת חשמל: ${totalElectricity.toLocaleString('he-IL')} קוט"ש (${electricityReadings.length} קריאות)   |   סה"כ צריכת מים: ${totalWater.toLocaleString('he-IL')} מ"ק (${waterReadings.length} קריאות)`;
    hebrewText(doc, summaryLine, doc.page.margins.left + 20, summaryBoxY + 22, { width: pageWidth - 40, align: 'right' });
    doc.y = summaryBoxY + summaryBoxHeight + 15;
    doc.fillColor('#000000');

    const columns = [
      { label: '#', key: 'id', width: 50, align: 'center' },
      { label: 'סוג', key: 'type', width: 130, align: 'right', format: v => translateEnergyType(v) },
      { label: 'קריאה', key: 'reading', width: 150, align: 'center' },
      { label: 'חודש', key: 'month', width: 130, align: 'center' },
      { label: 'תאריך', key: 'created_at', width: 130, align: 'center', format: v => formatDate(v) },
    ];

    drawTable(doc, columns, energy);
    addPageNumbers(doc);
    doc.end();
  } catch (err) {
    console.error('Export energy PDF error:', err.message);
    if (!res.headersSent) res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ============================================================
// דוח חודשי מקיף - Excel
// ============================================================
const exportMonthlyExcel = async (req, res) => {
  try {
    const [faults] = await db.query('SELECT * FROM faults ORDER BY created_at DESC');
    const [invoices] = await db.query(`
      SELECT i.*, u.full_name AS technician_name, f.title AS fault_title
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      ORDER BY i.created_at DESC
    `);
    const [energy] = await db.query('SELECT * FROM energy ORDER BY created_at DESC');
    const [maintenance] = await db.query('SELECT * FROM maintenance ORDER BY created_at DESC');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BUILDIX';

    const summarySheet = workbook.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
    summarySheet.columns = [{ width: 32 }, { width: 20 }];
    const openFaults = faults.filter(f => f.status !== 'closed').length;
    const closedFaults = faults.filter(f => f.status === 'closed').length;
    const totalInvoiceAmount = invoices.filter(i => i.status === 'approved').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'BUILDIX - דוח חודשי מקיף';
    summarySheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF1A3A6B' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'right' };
    summarySheet.getRow(1).height = 32;

    summarySheet.addRow([`הופק בתאריך: ${new Date().toLocaleDateString('he-IL')}`, '']);
    summarySheet.getRow(2).font = { size: 10, color: { argb: 'FF6B7280' } };
    summarySheet.addRow(['', '']);

    const summaryData = [
      ['סה"כ תקלות במערכת', faults.length],
      ['תקלות פתוחות', openFaults],
      ['תקלות סגורות', closedFaults],
      ['סה"כ חשבוניות מאושרות (₪)', totalInvoiceAmount.toFixed(2)],
      ['משימות תחזוקה פעילות', maintenance.filter(m => m.status !== 'done').length],
      ['קריאות אנרגיה שנרשמו', energy.length],
    ];
    summaryData.forEach(row => {
      const r = summarySheet.addRow(row);
      r.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1A3A6B' } };
      r.getCell(1).alignment = { horizontal: 'right' };
      r.getCell(2).font = { size: 12 };
      r.getCell(2).alignment = { horizontal: 'right' };
      r.height = 22;
    });

    const faultsSheet = workbook.addWorksheet('תקלות', { views: [{ rightToLeft: true }] });
    faultsSheet.columns = [
      { header: 'מספר', key: 'id', width: 8 },
      { header: 'כותרת', key: 'title', width: 28 },
      { header: 'סוג', key: 'fault_type', width: 16 },
      { header: 'סטטוס', key: 'status', width: 14 },
      { header: 'דחיפות', key: 'urgency', width: 12 },
      { header: 'קומה', key: 'floor', width: 10 },
      { header: 'יחידה', key: 'unit_number', width: 10 },
      { header: 'תאריך פתיחה', key: 'created_at', width: 16 },
    ];
    faults.forEach(f => faultsSheet.addRow({
      id: f.id, title: f.title, fault_type: f.fault_type,
      status: translateFaultStatus(f.status),
      urgency: f.urgency, floor: f.floor, unit_number: f.unit_number,
      created_at: formatDate(f.created_at)
    }));
    styleExcelHeader(faultsSheet);
    styleExcelDataRows(faultsSheet);
    faultsSheet.autoFilter = { from: 'A1', to: 'H1' };

    const invSheet = workbook.addWorksheet('חשבוניות', { views: [{ rightToLeft: true }] });
    invSheet.columns = [
      { header: 'מספר', key: 'id', width: 8 },
      { header: 'תקלה', key: 'fault_title', width: 26 },
      { header: 'טכנאי', key: 'technician_name', width: 20 },
      { header: 'סכום (₪)', key: 'amount', width: 14 },
      { header: 'סטטוס', key: 'status', width: 14 },
      { header: 'תאריך', key: 'created_at', width: 16 },
    ];
    invoices.forEach(i => invSheet.addRow({
      id: i.id, fault_title: i.fault_title || 'לא ידוע',
      technician_name: i.technician_name || 'לא ידוע',
      amount: i.amount ? parseFloat(i.amount) : 0,
      status: translateStatus(i.status), created_at: formatDate(i.created_at)
    }));
    invSheet.getColumn('amount').numFmt = '#,##0.00 "₪"';
    styleExcelHeader(invSheet);
    styleExcelDataRows(invSheet);
    invSheet.autoFilter = { from: 'A1', to: 'F1' };

    const energySheet = workbook.addWorksheet('אנרגיה', { views: [{ rightToLeft: true }] });
    energySheet.columns = [
      { header: 'סוג', key: 'type', width: 14 },
      { header: 'קריאה', key: 'reading', width: 14 },
      { header: 'חודש', key: 'month', width: 12 },
      { header: 'תאריך', key: 'created_at', width: 16 },
    ];
    energy.forEach(e => energySheet.addRow({
      type: translateEnergyType(e.type), reading: e.reading, month: e.month, created_at: formatDate(e.created_at)
    }));
    styleExcelHeader(energySheet);
    styleExcelDataRows(energySheet);
    energySheet.autoFilter = { from: 'A1', to: 'D1' };

    const mainSheet = workbook.addWorksheet('תחזוקה', { views: [{ rightToLeft: true }] });
    mainSheet.columns = [
      { header: 'כותרת', key: 'title', width: 28 },
      { header: 'קטגוריה', key: 'category', width: 16 },
      { header: 'סטטוס', key: 'status', width: 14 },
      { header: 'תאריך הבא', key: 'next_date', width: 16 },
    ];
    maintenance.forEach(m => mainSheet.addRow({
      title: m.title, category: m.category,
      status: m.status === 'done' ? 'בוצע' : 'ממתין',
      next_date: formatDate(m.next_date)
    }));
    styleExcelHeader(mainSheet);
    styleExcelDataRows(mainSheet);
    mainSheet.autoFilter = { from: 'A1', to: 'D1' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=buildix-monthly-report.xlsx');
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