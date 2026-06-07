// קונטרולר לניהול חשבוניות
const db = require('../config/DB');
const path = require('path');
const fs = require('fs');

// העלאת חשבונית חדשה - טכנאי בלבד
const uploadInvoice = async (req, res) => {
  try {
    const technician_id = req.user.id;
    const { fault_id, amount, description } = req.body;

    if (!fault_id) {
      return res.status(400).json({ message: 'Please select a fault.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file.' });
    }

    const file_url = `/uploads/${req.file.filename}`;

    await db.query(
      'INSERT INTO invoices (fault_id, technician_id, file_url, amount, description) VALUES (?, ?, ?, ?, ?)',
      [fault_id, technician_id, file_url, amount || null, description || null]
    );

    res.status(201).json({ message: 'Invoice uploaded successfully!' });

  } catch (err) {
    console.error('Upload invoice error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// קבלת כל החשבוניות - מנהל בלבד
const getAllInvoices = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, 
        u.full_name AS technician_name,
        f.title AS fault_title
      FROM invoices i
      LEFT JOIN users u ON i.technician_id = u.id
      LEFT JOIN faults f ON i.fault_id = f.id
      ORDER BY i.created_at DESC
    `);
    res.status(200).json({ invoices });
  } catch (err) {
    console.error('Get invoices error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// קבלת החשבוניות של הטכנאי המחובר
const getMyInvoices = async (req, res) => {
  try {
    const technician_id = req.user.id;
    const [invoices] = await db.query(`
      SELECT i.*, f.title AS fault_title
      FROM invoices i
      LEFT JOIN faults f ON i.fault_id = f.id
      WHERE i.technician_id = ?
      ORDER BY i.created_at DESC
    `, [technician_id]);
    res.status(200).json({ invoices });
  } catch (err) {
    console.error('Get my invoices error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// אישור או דחיית חשבונית - מנהל בלבד
const reviewInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, manager_note } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    // עדכון סטטוס החשבונית
    await db.query(
      'UPDATE invoices SET status = ?, manager_note = ? WHERE id = ?',
      [status, manager_note || null, id]
    );

    // קבלת פרטי החשבונית לשליחת הודעה לטכנאי
    const [invoices] = await db.query(
      'SELECT i.*, u.full_name AS technician_name FROM invoices i LEFT JOIN users u ON i.technician_id = u.id WHERE i.id = ?',
      [id]
    );

    if (invoices.length > 0) {
      const invoice = invoices[0];
      const isApproved = status === 'approved';
      const subject = isApproved
        ? `✅ חשבונית אושרה`
        : `❌ חשבונית נדחתה`;
      const body = isApproved
        ? `החשבונית שלך אושרה על ידי המנהל.${manager_note ? `\nהערת מנהל: ${manager_note}` : ''}`
        : `החשבונית שלך נדחתה.${manager_note ? `\nסיבה: ${manager_note}` : ''}`;

      // שליחת הודעה לטכנאי
      const managerId = req.user.id;
      await db.query(
        'INSERT INTO user_messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)',
        [managerId, invoice.technician_id, subject, body]
      );
    }

    res.status(200).json({ message: `Invoice ${status} successfully!` });

  } catch (err) {
    console.error('Review invoice error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { uploadInvoice, getAllInvoices, getMyInvoices, reviewInvoice };