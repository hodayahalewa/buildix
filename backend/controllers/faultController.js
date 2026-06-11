// קונטרולר לניהול תקלות במערכת
const db = require('../config/DB');

// הוספת תקלה חדשה על ידי דייר או מנהל
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

    res.status(201).json({ message: 'Fault reported successfully!', fault_id: result.insertId });

  } catch (err) {
    console.error('Report fault error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת כל התקלות - למנהל בלבד (כולל סגורות - הסינון בצד הלקוח)
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

// קבלת התקלות של הדייר המחובר בלבד (כולל סגורות - הסינון בצד הלקוח)
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

// קבלת התקלות המוקצות לטכנאי המחובר (כולל סגורות - הסינון בצד הלקוח)
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

// שיוך תקלה לטכנאי על ידי המנהל
const assignFault = async (req, res) => {
  try {
    const { fault_id, technician_id } = req.body;

    const [technician] = await db.query(
      'SELECT id FROM users WHERE id = ? AND role = ?',
      [technician_id, 'technician']
    );

    if (technician.length === 0) {
      return res.status(404).json({ message: 'Technician not found.' });
    }

    await db.query(
      'UPDATE faults SET assigned_to = ?, status = ? WHERE id = ?',
      [technician_id, 'in_progress', fault_id]
    );

    res.status(200).json({ message: 'Fault assigned successfully!' });

  } catch (err) {
    console.error('Assign fault error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עדכון סטטוס תקלה על ידי טכנאי או מנהל
const updateFaultStatus = async (req, res) => {
  try {
    const { fault_id, status, note } = req.body;
    const updated_by = req.user.id;

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

    res.status(200).json({ message: 'Fault status updated successfully!' });

  } catch (err) {
    console.error('Update fault status error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת היסטוריית עדכונים של תקלה ספציפית
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

module.exports = { reportFault, getAllFaults, getMyFaults, getAssignedFaults, assignFault, updateFaultStatus, getFaultUpdates };