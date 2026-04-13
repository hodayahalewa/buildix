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

    // בדיקה שכל השדות החובה קיימים
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // בדיקה שהמייל לא קיים כבר במערכת
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // הצפנת הסיסמה לפני שמירה במסד הנתונים
    const hashedPassword = await bcrypt.hash(password, 10);

    // מנהל מאושר אוטומטית, דייר וטכנאי ממתינים לאישור
    const isApproved = role === 'manager' ? true : false;

    // שמירת המשתמש החדש במסד הנתונים
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

    // בדיקה שהמייל והסיסמה סופקו
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // חיפוש המשתמש במסד הנתונים לפי מייל
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // בדיקה שהמשתמש אושר על ידי המנהל
    if (!user.is_approved) {
      return res.status(403).json({ message: 'Your account is pending manager approval.' });
    }

    // השוואת הסיסמה המוצפנת
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // יצירת טוקן JWT עם פרטי המשתמש
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

module.exports = { register, login };