const db = require('../config/DB');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {
  sendApprovalEmail,
  sendRejectionEmail
} = require('../services/emailService');

dotenv.config();

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
    const isApproved = role === 'manager' ? 1 : 0;
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

    if (user.is_approved === 0) {
      return res.status(403).json({ message: 'Your account is pending manager approval.' });
    }
    if (user.is_approved === 2) {
      return res.status(403).json({ message: 'Your registration request was rejected. Please contact the building manager.' });
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
        must_change_password: user.must_change_password
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

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

const approveUser = async (req, res) => {
  console.log('🔴🔴🔴 approveUser CALLED with body:', req.body);
  try {
    const { user_id, action } = req.body;

    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    const [users] = await db.query('SELECT full_name, email FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const { full_name, email } = users[0];

    if (action === 'approve') {
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedTemp = await bcrypt.hash(tempPassword, 10);
      await db.query('UPDATE users SET is_approved = 1, password = ?, must_change_password = 1 WHERE id = ?', [hashedTemp, user_id]);
      try {
        await sendApprovalEmail(email, full_name, tempPassword);
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }
      return res.status(200).json({ message: 'User approved successfully!' });
    }

    if (action === 'reject') {
      await db.query('UPDATE users SET is_approved = 2 WHERE id = ?', [user_id]);
      try {
        await sendRejectionEmail(email, full_name);
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
      }
      return res.status(200).json({ message: 'User rejected successfully.' });
    }

    if (action === 'revoke') {
      await db.query('UPDATE users SET is_approved = 0 WHERE id = ?', [user_id]);
      return res.status(200).json({ message: 'User approval revoked.' });
    }

  } catch (err) {
    console.error('Approve user error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

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

const replyToMessage = async (req, res) => {
  try {
    const { original_message_id, body } = req.body;
    const from_user_id = req.user.id;
    if (!original_message_id || !body) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    const [original] = await db.query('SELECT * FROM user_messages WHERE id = ?', [original_message_id]);
    if (original.length === 0) {
      return res.status(404).json({ message: 'Original message not found.' });
    }
    const [sender] = await db.query('SELECT full_name FROM users WHERE id = ?', [from_user_id]);
    const senderName = sender[0]?.full_name || 'Unknown';
    const replySubject = `↩️ תשובה מ-${senderName}: ${original[0].subject}`;
    await db.query(
      'INSERT INTO user_messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)',
      [from_user_id, original[0].from_user_id, replySubject, body]
    );
    await db.query('UPDATE user_messages SET is_read = 1 WHERE id = ?', [original_message_id]);
    res.status(200).json({ message: 'Reply sent successfully!' });
  } catch (err) {
    console.error('Reply error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'אנא הזיני כתובת מייל.' });
    }
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'המייל לא נמצא במערכת.' });
    }
    const user = users[0];
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTemp = await bcrypt.hash(tempPassword, 10);
    await db.query('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?', [hashedTemp, user.id]);
    try {
      await sendApprovalEmail(user.email, user.full_name, tempPassword);
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }
    res.status(200).json({ message: 'סיסמה זמנית נשלחה למייל שלך!' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'שגיאת שרת. אנא נסי שוב.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'אנא מלאי את כל השדות.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'הסיסמאות אינן תואמות.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?',
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'הסיסמה עודכנה בהצלחה!' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ message: 'שגיאת שרת.' });
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
  replyToMessage,
  forgotPassword,
  changePassword
};