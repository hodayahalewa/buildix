// קונטרולר לניהול הרשמה והתחברות משתמשים
const db = require('../config/DB');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// הרשמת משתמש חדש למערכת
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, role, unit_number, floor, owner_phone } = req.body;
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = role === 'manager' ? true : false;
    await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, unit_number, floor, owner_phone, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [full_name, email, phone, hashedPassword, role, unit_number, floor, owner_phone, isApproved]
    );
    res.status(201).json({ message: 'Registration successful! Waiting for manager approval.' });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// התחברות משתמש קיים למערכת
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }
    const user = users[0];
    if (!user.is_approved) {
      return res.status(403).json({ message: 'Your account is pending manager approval.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        unit_number: user.unit_number,
        floor: user.floor,
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת כל המשתמשים הממתינים לאישור
const getPendingUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, unit_number, floor, created_at FROM users WHERE is_approved = 0'
    );
    res.status(200).json({ users });
  } catch (err) {
    console.error('Get pending users error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// אישור או דחיית משתמש
const approveUser = async (req, res) => {
  try {
    const { user_id, approved } = req.body;
    if (approved) {
      await db.query('UPDATE users SET is_approved = 1 WHERE id = ?', [user_id]);
      res.status(200).json({ message: 'User approved successfully!' });
    } else {
      await db.query('DELETE FROM users WHERE id = ?', [user_id]);
      res.status(200).json({ message: 'User rejected and removed.' });
    }
  } catch (err) {
    console.error('Approve user error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת כל הטכנאים
const getTechnicians = async (req, res) => {
  try {
    const [technicians] = await db.query(
      'SELECT id, full_name, email, phone FROM users WHERE role = ? AND is_approved = 1',
      ['technician']
    );
    res.status(200).json({ technicians });
  } catch (err) {
    console.error('Get technicians error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// קבלת כל המשתמשים
const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, floor, unit_number, is_approved, created_at FROM users ORDER BY is_approved ASC, created_at DESC'
    );
    res.status(200).json({ users });
  } catch (err) {
    console.error('Get all users error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// שליחת הודעה למשתמש ושמירה במסד הנתונים
const sendMessageToUser = async (req, res) => {
  try {
    const { user_id, subject, body } = req.body;
    const from_user_id = req.user.id;
    if (!user_id || !subject || !body) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    const [users] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await db.query(
      'INSERT INTO user_messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)',
      [from_user_id, user_id, subject, body]
    );
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Send message error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// קבלת כל ההודעות של המשתמש המחובר
const getMyMessages = async (req, res) => {
  try {
    const user_id = req.user.id;
    const [messages] = await db.query(
  `SELECT m.*, u.full_name AS from_name 
   FROM user_messages m
   LEFT JOIN users u ON m.from_user_id = u.id
   WHERE m.to_user_id = ? AND m.is_read = 0
   ORDER BY m.created_at DESC`,
  [user_id]
);
    const unreadCount = messages.filter(m => !m.is_read).length;
    res.status(200).json({ messages, unreadCount });
  } catch (err) {
    console.error('Get messages error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// סימון הודעה כנקראה
const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    await db.query(
      'UPDATE user_messages SET is_read = 1 WHERE id = ? AND to_user_id = ?',
      [id, user_id]
    );
    res.status(200).json({ message: 'Message marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

// שליחת תשובה להודעה - שומר ושולח למנהל
const replyToMessage = async (req, res) => {
  try {
    const { original_message_id, body } = req.body;
    const from_user_id = req.user.id;

    if (!original_message_id || !body) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }

    // קבלת ההודעה המקורית
    const [original] = await db.query(
      'SELECT * FROM user_messages WHERE id = ?',
      [original_message_id]
    );
    if (original.length === 0) {
      return res.status(404).json({ message: 'Original message not found.' });
    }

    // קבלת שם השולח
    const [sender] = await db.query(
      'SELECT full_name FROM users WHERE id = ?',
      [from_user_id]
    );

    const senderName = sender[0]?.full_name || 'Unknown';
    const replySubject = `↩️ תשובה מ-${senderName}: ${original[0].subject}`;

    // שמירת התשובה - נשלחת לשולח המקורי
    await db.query(
      'INSERT INTO user_messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)',
      [from_user_id, original[0].from_user_id, replySubject, body]
    );

    // סימון ההודעה המקורית כנקראה
    await db.query(
      'UPDATE user_messages SET is_read = 1 WHERE id = ?',
      [original_message_id]
    );

    res.status(200).json({ message: 'Reply sent successfully!' });
  } catch (err) {
    console.error('Reply error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  register,
  login,
  getPendingUsers,
  approveUser,
  getTechnicians,
  getAllUsers,
  sendMessageToUser,
  getMyMessages,
  markMessageRead,
  replyToMessage
};