const db = require('../config/DB');
const { sendAnnouncementEmail } = require('../services/emailService');

// קבלת כל המודעות
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

// הוספת מודעה חדשה + שליחת מייל לכל הדיירים והטכנאים (ברקע, לא חוסם את התגובה)
const addAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, starts_at, expires_at } = req.body;
    const created_by = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    await db.query(
      'INSERT INTO announcements (title, content, priority, starts_at, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, priority || 'medium', starts_at || null, created_by, expires_at || null]
    );

    // מגיבים למנהל מיד - לא מחכים לשליחת המיילים
    res.status(201).json({ message: 'Announcement added successfully!' });

    // שליחת מיילים ברקע - במקביל לכולם, לא חוסם ולא מעכב את המשתמש
    (async () => {
      try {
        const [users] = await db.query(
          `SELECT email, full_name FROM users 
           WHERE role IN ('tenant', 'technician') 
           AND is_approved = 1`
        );

        const results = await Promise.allSettled(
          users.map(u => sendAnnouncementEmail(u.email, u.full_name, title, content))
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.error(`Announcement emails: ${failed.length}/${users.length} failed to send.`);
          failed.forEach(f => console.error('  -', f.reason?.message || f.reason));
        } else {
          console.log(`Announcement emails: sent successfully to ${users.length} users.`);
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }
    })();

  } catch (err) {
    console.error('Add announcement error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// עריכת מודעה
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority, starts_at, expires_at } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

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