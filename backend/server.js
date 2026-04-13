// ייבוא חבילות נדרשות
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/DB');

// טעינת משתני הסביבה
dotenv.config();

// ייבוא נתיבים
const authRoutes = require('./routes/authRoutes');
const faultRoutes = require('./routes/faultRoutes');

// בדיקה שהנתיבים נטענו נכון
console.log('authRoutes type:', typeof authRoutes);
console.log('faultRoutes type:', typeof faultRoutes);

// יצירת אפליקציית Express
const app = express();

// הגדרת middleware
app.use(cors());
app.use(express.json());

// חיבור נתיבים
app.use('/api/auth', authRoutes);
app.use('/api/faults', faultRoutes);

// נתיב בדיקה בסיסי
app.get('/', (req, res) => {
  res.json({ message: 'BUILDIX Server is running!' });
});

// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});