const db = require('../config/DB');
const {
  sendFaultCreatedEmail,
  sendFaultStatusEmail,
  sendFaultAssignedEmail
} = require('../services/emailService');

const allowedStatuses = ['open', 'in_progress', 'waiting_part', 'pending_approval', 'closed'];

// דיווח תקלה חדשה
const reportFault = async (req, res) => {
  try {
    const { title, description, fault_type, urgency, floor, unit_number } = req.body;
    const reported_by = req.user.id;

    if (!title || !fault_type || !urgency) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const [result] = await db.query(
      'INSERT INTO faults (title, description, fault_type, urgency, floor, unit_number, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, fault_type, urgency, floor, unit_number, reported_by]
    );

    // שליחת מייל אישור קבלת תקלה
    try {
      const [users] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [reported_by]);
      if (users.length > 0) {
        await sendFaultCreatedEmail(users[0].email, users[0].full_name, result.insertId, title);
      }
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.status(201).json({ message: 'Fault reported successfully!', fault_id: result.insertId });

  } catch (err) {
    console.error('Report fault error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// כל התקלות למנהל
const getAllFaults = async (req, res) => {
  try {
    const [faults] = await db.query(`
      SELECT 
        f.*,
        u1.full_name AS reported_by_name,
        u2.full_name AS assigned_to_name
      FROM faults f
      LEFT JOIN users u1 ON f.reported_by = u1.id
      LEFT JOIN users u2 ON f.assigned_to = u2.id
      ORDER BY 
        FIELD(f.urgency, 'high', 'medium', 'low'),
        f.created_at DESC
    `);
    res.status(200).json({ faults });
  } catch (err) {
    console.error('Get all faults error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// תקלות הדייר המחובר
const getMyFaults = async (req, res) => {
  try {
    const userId = req.user.id;
    const [faults] = await db.query(`
      SELECT * FROM faults 
      WHERE reported_by = ?
      ORDER BY 
        FIELD(urgency, 'high', 'medium', 'low'),
        created_at DESC
    `, [userId]);
    res.status(200).json({ faults });
  } catch (err) {
    console.error('Get my faults error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// תקלות מוקצות לטכנאי
const getAssignedFaults = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const [faults] = await db.query(`
      SELECT 
        f.*,
        u.full_name AS reported_by_name
      FROM faults f
      LEFT JOIN users u ON f.reported_by = u.id
      WHERE f.assigned_to = ?
      ORDER BY 
        FIELD(f.urgency, 'high', 'medium', 'low'),
        f.created_at DESC
    `, [technicianId]);
    res.status(200).json({ faults });
  } catch (err) {
    console.error('Get assigned faults error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// כל תקלות הבניין לדייר
const getBuildingFaults = async (req, res) => {
  try {
    const [faults] = await db.query(`
      SELECT 
        f.*,
        u.full_name AS reported_by_name
      FROM faults f
      LEFT JOIN users u ON f.reported_by = u.id
      ORDER BY 
        FIELD(f.urgency, 'high', 'medium', 'low'),
        f.created_at DESC
    `);
    res.status(200).json({ faults });
  } catch (err) {
    console.error('Get building faults error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// שיוך תקלה לטכנאי + שליחת מייל
const assignFault = async (req, res) => {
  try {
    const { fault_id, technician_id } = req.body;

    const [technician] = await db.query(
      'SELECT id, full_name, email FROM users WHERE id = ? AND role = ?',
      [technician_id, 'technician']
    );

    if (technician.length === 0) {
      return res.status(404).json({ message: 'Technician not found.' });
    }

    const [fault] = await db.query('SELECT title FROM faults WHERE id = ?', [fault_id]);

    await db.query(
      'UPDATE faults SET assigned_to = ?, status = ? WHERE id = ?',
      [technician_id, 'in_progress', fault_id]
    );

    // שליחת מייל לטכנאי
    try {
      await sendFaultAssignedEmail(
        technician[0].email,
        technician[0].full_name,
        fault_id,
        fault[0].title
      );
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.status(200).json({ message: 'Fault assigned successfully!' });

  } catch (err) {
    console.error('Assign fault error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עדכון סטטוס תקלה + שליחת מייל
const updateFaultStatus = async (req, res) => {
  try {
    const { fault_id, status, note } = req.body;
    const updated_by = req.user.id;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    // רק מנהל יכול לסגור תקלה - הסגירה נעשית אוטומטית רק לאחר אישור החשבונית
    if (status === 'closed' && req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'Only a manager can close a fault. The fault closes automatically once the invoice is approved.'
      });
    }

    await db.query(
      'UPDATE faults SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, fault_id]
    );

    if (status === 'closed') {
      await db.query('UPDATE faults SET closed_at = NOW() WHERE id = ?', [fault_id]);
    }

    await db.query(
      'INSERT INTO fault_updates (fault_id, updated_by, status, note) VALUES (?, ?, ?, ?)',
      [fault_id, updated_by, status, note]
    );

    // שליחת מייל למדווח על עדכון סטטוס
    try {
      const [fault] = await db.query(`
        SELECT f.title, f.reported_by, u.email, u.full_name 
        FROM faults f
        LEFT JOIN users u ON f.reported_by = u.id
        WHERE f.id = ?
      `, [fault_id]);

      if (fault.length > 0) {
        await sendFaultStatusEmail(
          fault[0].email,
          fault[0].full_name,
          fault_id,
          fault[0].title,
          status
        );
      }
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.status(200).json({ message: 'Fault status updated successfully!' });

  } catch (err) {
    console.error('Update fault status error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// היסטוריית עדכונים
const getFaultUpdates = async (req, res) => {
  try {
    const { id } = req.params;
    const [updates] = await db.query(
      `SELECT fu.*, u.full_name AS updated_by_name 
       FROM fault_updates fu
       LEFT JOIN users u ON fu.updated_by = u.id
       WHERE fu.fault_id = ?
       ORDER BY fu.created_at ASC`,
      [id]
    );
    res.status(200).json({ updates });
  } catch (err) {
    console.error('Get fault updates error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// העלאת תמונות לתקלה
const uploadFaultImages = async (req, res) => {
  try {
    const { fault_id } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded.' });
    }
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    const imagesJson = JSON.stringify(imageUrls);
    await db.query('UPDATE faults SET IMAGES = ? WHERE id = ?', [imagesJson, fault_id]);
    res.status(200).json({ message: 'Images uploaded successfully!', images: imageUrls });
  } catch (err) {
    console.error('Upload images error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// מחיקת תקלה
const deleteFault = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [fault] = await db.query('SELECT * FROM faults WHERE id = ?', [id]);
    if (fault.length === 0) {
      return res.status(404).json({ message: 'Fault not found.' });
    }

    if (userRole !== 'manager' && fault[0].reported_by !== userId) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    await db.query('DELETE FROM fault_updates WHERE fault_id = ?', [id]);
    await db.query('DELETE FROM faults WHERE id = ?', [id]);

    res.status(200).json({ message: 'Fault deleted successfully!' });
  } catch (err) {
    console.error('Delete fault error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  reportFault,
  getAllFaults,
  getMyFaults,
  getAssignedFaults,
  getBuildingFaults,
  assignFault,
  updateFaultStatus,
  getFaultUpdates,
  uploadFaultImages,
  deleteFault
};