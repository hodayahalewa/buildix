// קונטרולר לניהול תחזוקה מונעת
const db = require('../config/DB');

// קבלת כל משימות התחזוקה
const getAllMaintenance = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT m.*, u.full_name AS assigned_to_name
      FROM maintenance m
      LEFT JOIN users u ON m.assigned_to = u.id
      ORDER BY m.next_due ASC
    `);
    res.status(200).json({ tasks });
  } catch (err) {
    console.error('Get maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// הוספת משימת תחזוקה חדשה
const addMaintenance = async (req, res) => {
  try {
    const { title, category, description, frequency, last_done, next_due } = req.body;

    // בדיקה שכל השדות החובה קיימים
    if (!title || !category || !frequency || !next_due) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // שמירת משימת התחזוקה במסד הנתונים
    await db.query(
      'INSERT INTO maintenance (title, category, description, frequency, last_done, next_due) VALUES (?, ?, ?, ?, ?, ?)',
      [title, category, description, frequency, last_done, next_due]
    );

    res.status(201).json({ message: 'Maintenance task added successfully!' });

  } catch (err) {
    console.error('Add maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// סימון משימת תחזוקה כבוצעה
const markDone = async (req, res) => {
  try {
    const { task_id } = req.body;

    // עדכון סטטוס המשימה ותאריך הביצוע האחרון
    await db.query(
      'UPDATE maintenance SET status = ?, last_done = CURDATE(), reminder_sent = 0 WHERE id = ?',
      ['done', task_id]
    );

    res.status(200).json({ message: 'Task marked as done!' });

  } catch (err) {
    console.error('Mark done error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAllMaintenance, addMaintenance, markDone };