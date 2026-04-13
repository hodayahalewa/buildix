// ייבוא חבילות נדרשות
const mysql = require('mysql2');
const dotenv = require('dotenv');

// טעינת משתני הסביבה מקובץ .env
dotenv.config();

// יצירת מאגר חיבורים למסד הנתונים
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// המרת מאגר החיבורים לגרסה מבוססת Promises
const promisePool = pool.promise();

// בדיקת חיבור למסד הנתונים בעת הפעלת השרת
promisePool.getConnection()
  .then(conn => {
    console.log('Database connection successful!');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });

module.exports = promisePool;