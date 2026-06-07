// קונטרולר לניהול מודעות
const db = require('../config/DB');

// קבלת כל המודעות - מסנן מודעות שפג תוקפן ומודעות שטרם התחילו
const getAllAnnouncements = async (req, res) => {
  try {
    const [announcements] = await db.query(`
      SELECT a.*, u.full_name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE (a.expires_at IS NULL OR a.expires_at >= CURDATE())
      AND (a.starts_at IS NULL OR a.starts_at <= CURDATE())
      ORDER BY 
        CASE a.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        a.created_at DESC
    `);
    res.status(200).json({ announcements });
  } catch (err) {
    console.error('Get announcements error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// הוספת מודעה חדשה עם תאריך התחלה, סיום ורמת דחיפות
const addAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, starts_at, expires_at } = req.body;
    const created_by = req.user.id;

    // בדיקה שכל השדות החובה קיימים
    if (!title || !content) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // שמירת המודעה עם כל השדות
    await db.query(
      'INSERT INTO announcements (title, content, priority, starts_at, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, priority || 'medium', starts_at || null, created_by, expires_at || null]
    );

    res.status(201).json({ message: 'Announcement added successfully!' });

  } catch (err) {
    console.error('Add announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עריכת מודעה קיימת עם כל השדות
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority, starts_at, expires_at } = req.body;

    // בדיקה שכל השדות החובה קיימים
    if (!title || !content) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // עדכון המודעה במסד הנתונים
    await db.query(
      'UPDATE announcements SET title=?, content=?, priority=?, starts_at=?, expires_at=? WHERE id=?',
      [title, content, priority || 'medium', starts_at || null, expires_at || null, id]
    );

    res.status(200).json({ message: 'Announcement updated successfully!' });

  } catch (err) {
    console.error('Update announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// מחיקת מודעה
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.status(200).json({ message: 'Announcement deleted successfully!' });
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { getAllAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement };