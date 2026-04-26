// קונטרולר לניהול מדידות אנרגיה
const db = require('../config/DB');

// קבלת כל המדידות
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

// הוספת מדידה חדשה
const addReading = async (req, res) => {
  try {
    const { type, reading, month } = req.body;

    // בדיקה שכל השדות החובה קיימים
    if (!type || !reading || !month) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // שמירת המדידה במסד הנתונים
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

module.exports = { getAllReadings, addReading };