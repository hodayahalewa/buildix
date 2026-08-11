const db = require('../config/DB');
const { sendInvoiceReviewEmail, sendFaultStatusEmail } = require('../services/emailService');

// העלאת חשבונית
const uploadInvoice = async (req, res) => {
  try {
    const { fault_id, amount, description } = req.body;
    const technician_id = req.user.id;

    if (!fault_id || !req.file) {
      return res.status(400).json({ message: 'Please provide fault ID and invoice file.' });
    }

    const file_url = `/uploads/${req.file.filename}`;

    await db.query(
      'INSERT INTO invoices (fault_id, technician_id, file_url, amount, description) VALUES (?, ?, ?, ?, ?)',
      [fault_id, technician_id, file_url, amount || null, description || null]
    );

    res.status(201).json({ message: 'Invoice uploaded successfully!' });

  } catch (err) {
    console.error('Upload invoice error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת כל החשבוניות למנהל
const getAllInvoices = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT 
        i.*,
        u.full_name AS technician_name,
        f.title AS fault_title
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      ORDER BY i.created_at DESC
    `);
    res.status(200).json({ invoices });
  } catch (err) {
    console.error('Get all invoices error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת חשבוניות הטכנאי
const getMyInvoices = async (req, res) => {
  try {
    const technician_id = req.user.id;
    const [invoices] = await db.query(`
      SELECT 
        i.*,
        f.title AS fault_title
      FROM invoices i
      LEFT JOIN faults f ON i.fault_id = f.id
      WHERE i.technician_id = ?
      ORDER BY i.created_at DESC
    `, [technician_id]);
    res.status(200).json({ invoices });
  } catch (err) {
    console.error('Get my invoices error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// אישור או דחיית חשבונית + שליחת מייל לטכנאי + טיפול בסגירת/פתיחת התקלה
const reviewInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, manager_note } = req.body;
    const manager_id = req.user.id;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    // קבלת פרטי החשבונית, הטכנאי, התקלה והדייר
    const [invoices] = await db.query(`
      SELECT 
        i.*,
        u.email AS technician_email,
        u.full_name AS technician_name,
        f.title AS fault_title,
        f.reported_by AS tenant_id,
        tu.email AS tenant_email,
        tu.full_name AS tenant_name
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      LEFT JOIN users tu ON f.reported_by = tu.id
      WHERE i.id = ?
    `, [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    const invoice = invoices[0];

    if (invoice.status !== 'pending') {
      return res.status(400).json({ message: 'This invoice has already been reviewed.' });
    }

    // עדכון סטטוס החשבונית
    await db.query(
      'UPDATE invoices SET status = ?, manager_note = ? WHERE id = ?',
      [status, manager_note || null, id]
    );

    if (status === 'approved') {
      // ✅ אישור החשבונית -> סגירת התקלה סופית
      await db.query(
        'UPDATE faults SET status = ?, closed_at = NOW(), updated_at = NOW() WHERE id = ?',
        ['closed', invoice.fault_id]
      );
      await db.query(
        'INSERT INTO fault_updates (fault_id, updated_by, status, note) VALUES (?, ?, ?, ?)',
        [invoice.fault_id, manager_id, 'closed', manager_note || 'החשבונית אושרה והתקלה נסגרה סופית']
      );

      // הודעה לדייר שהתקלה נסגרה
      try {
        if (invoice.tenant_email) {
          await sendFaultStatusEmail(
            invoice.tenant_email,
            invoice.tenant_name,
            invoice.fault_id,
            invoice.fault_title,
            'closed'
          );
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }

    } else {
      // ❌ דחיית החשבונית -> החזרת התקלה לטיפול כדי שהטכנאי יוכל לצרף חשבונית חדשה
      await db.query(
        'UPDATE faults SET status = ?, updated_at = NOW() WHERE id = ?',
        ['in_progress', invoice.fault_id]
      );
      await db.query(
        'INSERT INTO fault_updates (fault_id, updated_by, status, note) VALUES (?, ?, ?, ?)',
        [
          invoice.fault_id,
          manager_id,
          'in_progress',
          `החשבונית נדחתה - נדרשת חשבונית חדשה.${manager_note ? ' הערת מנהל: ' + manager_note : ''}`
        ]
      );

      // הודעה בתיבת ההודעות באתר לטכנאי
      try {
        await db.query(
          'INSERT INTO user_messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)',
          [
            manager_id,
            invoice.technician_id,
            `החשבונית לתקלה #${invoice.fault_id} נדחתה`,
            `החשבונית שהגשת עבור תקלה #${invoice.fault_id} - "${invoice.fault_title}" נדחתה על ידי המנהל. יש לצרף חשבונית מתוקנת דרך עמוד "התקלות המוקצות לי".${manager_note ? '\n\nהערת מנהל: ' + manager_note : ''}`
          ]
        );
      } catch (msgErr) {
        console.error('Message insert error:', msgErr.message);
      }
    }

    // שליחת מייל לטכנאי על תוצאת הבדיקה
    try {
      await sendInvoiceReviewEmail(
        invoice.technician_email,
        invoice.technician_name,
        invoice.fault_id,
        status,
        manager_note
      );
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.status(200).json({ message: `Invoice ${status} successfully!` });

  } catch (err) {
    console.error('Review invoice error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = {
  uploadInvoice,
  getAllInvoices,
  getMyInvoices,
  reviewInvoice
};