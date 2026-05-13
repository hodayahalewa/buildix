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
    const { title, category, description, frequency, verification_type, last_done, next_due } = req.body;
    if (!title || !category || !frequency || !next_due) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    await db.query(
      'INSERT INTO maintenance (title, category, description, frequency, verification_type, last_done, next_due) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, category, description, frequency, verification_type || 'manual', last_done, next_due]
    );
    res.status(201).json({ message: 'Maintenance task added successfully!' });
  } catch (err) {
    console.error('Add maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// סימון משימה כבוצעה - בודק אימות לפי סוג המשימה
const markDone = async (req, res) => {
  try {
    const { task_id } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);

    // בדיקה שהמשימה קיימת
    const [tasks] = await db.query(
      'SELECT * FROM maintenance WHERE id = ? AND status = ?',
      [task_id, 'pending']
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found or already completed.' });
    }

    const task = tasks[0];

    // בדיקה לפי סוג האימות - חשמל
    if (task.verification_type === 'energy_electricity') {
      const [readings] = await db.query(
        'SELECT id FROM energy WHERE type = ? AND month = ?',
        ['electricity', currentMonth]
      );
      if (readings.length === 0) {
        return res.status(400).json({
          message: `לא נמצאה מדידת חשמל לחודש ${currentMonth}. אנא הזן מדידה תחילה.`,
          redirect: 'energy.html'
        });
      }
    }

    // בדיקה לפי סוג האימות - מים
    if (task.verification_type === 'energy_water') {
      const [readings] = await db.query(
        'SELECT id FROM energy WHERE type = ? AND month = ?',
        ['water', currentMonth]
      );
      if (readings.length === 0) {
        return res.status(400).json({
          message: `לא נמצאה מדידת מים לחודש ${currentMonth}. אנא הזן מדידה תחילה.`,
          redirect: 'energy.html'
        });
      }
    }

    // עדכון המשימה כבוצעה
    await db.query(
      `UPDATE maintenance SET status = 'done', last_done = CURDATE(), reminder_sent = 0 WHERE id = ?`,
      [task_id]
    );

    res.status(200).json({ message: 'Task marked as done!' });

  } catch (err) {
    console.error('Mark done error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עדכון משימת תחזוקה קיימת
const updateMaintenance = async (req, res) => {
  try {
    const { id, title, category, description, frequency, verification_type, last_done, next_due } = req.body;
    if (!title || !category || !frequency || !next_due) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    await db.query(
      'UPDATE maintenance SET title=?, category=?, description=?, frequency=?, verification_type=?, last_done=?, next_due=? WHERE id=?',
      [title, category, description, frequency, verification_type || 'manual', last_done || null, next_due, id]
    );
    res.status(200).json({ message: 'Task updated successfully!' });
  } catch (err) {
    console.error('Update maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// מחיקת משימת תחזוקה
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM maintenance WHERE id = ?', [id]);
    res.status(200).json({ message: 'Task deleted successfully!' });
  } catch (err) {
    console.error('Delete maintenance error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAllMaintenance, addMaintenance, markDone, updateMaintenance, deleteMaintenance };