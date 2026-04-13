// middleware לאימות טוקן JWT והרשאות לפי תפקיד
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// בדיקת תקינות הטוקן בכל בקשה מאובטחת
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// בדיקת הרשאות לפי תפקיד המשתמש
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };