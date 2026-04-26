// קונטרולר לניהול מודעות
const db = require('../config/DB');

// קבלת כל המודעות
const getAllAnnouncements = async (req, res) => {
  try {
    const [announcements] = await db.query(`
      SELECT a.*, u.full_name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);
    res.status(200).json({ announcements });
  } catch (err) {
    console.error('Get announcements error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// הוספת מודעה חדשה
const addAnnouncement = async (req, res) => {
  try {
    const { title, content, expires_at } = req.body;
    const created_by = req.user.id;

    // בדיקה שכל השדות החובה קיימים
    if (!title || !content) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // שמירת המודעה במסד הנתונים
    await db.query(
      'INSERT INTO announcements (title, content, created_by, expires_at) VALUES (?, ?, ?, ?)',
      [title, content, created_by, expires_at || null]
    );

    res.status(201).json({ message: 'Announcement added successfully!' });

  } catch (err) {
    console.error('Add announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// מחיקת מודעה
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // מחיקת המודעה ממסד הנתונים
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);

    res.status(200).json({ message: 'Announcement deleted successfully!' });

  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAllAnnouncements, addAnnouncement, deleteAnnouncement };