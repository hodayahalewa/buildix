// קונטרולר לניהול מדידות אנרגיה
const db = require('../config/DB');

// קבלת כל המדידות מהשרת
const getAllReadings = async (req, res) => {
  try {
    const [readings] = await db.query(
      'SELECT * FROM energy ORDER BY month DESC'
    );
    res.status(200).json({ readings });
  } catch (err) {
    console.error('Get energy error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// הוספת מדידה חדשה - עם בדיקה שלא קיימת מדידה לאותו חודש וסוג
const addReading = async (req, res) => {
  try {
    const { type, reading, month } = req.body;

    // בדיקה שכל השדות החובה קיימים
    if (!type || !reading || !month) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // בדיקה אם כבר קיימת מדידה לאותו חודש וסוג
    const [existing] = await db.query(
      'SELECT id FROM energy WHERE type = ? AND month = ?',
      [type, month]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: `A reading for ${type} in ${month} already exists. Use update instead.`,
        existing_id: existing[0].id
      });
    }

    // שמירת המדידה החדשה
    await db.query(
      'INSERT INTO energy (type, reading, month) VALUES (?, ?, ?)',
      [type, reading, month]
    );

    res.status(201).json({ message: 'Reading added successfully!' });

  } catch (err) {
    console.error('Add reading error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עדכון מדידה קיימת
const updateReading = async (req, res) => {
  try {
    const { id, reading } = req.body;

    // בדיקה שהמדידה קיימת
    const [existing] = await db.query('SELECT id FROM energy WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Reading not found.' });
    }

    // עדכון המדידה
    await db.query('UPDATE energy SET reading = ? WHERE id = ?', [reading, id]);

    res.status(200).json({ message: 'Reading updated successfully!' });

  } catch (err) {
    console.error('Update reading error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAllReadings, addReading, updateReading };