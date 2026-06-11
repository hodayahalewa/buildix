// נתיבי ניהול תקלות
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/DB');
const {
  reportFault,
  getAllFaults,
  getMyFaults,
  getAssignedFaults,
  assignFault,
  updateFaultStatus,
  getFaultUpdates
} = require('../controllers/faultController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// הגדרת multer לתמונות תקלות
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = `fault_${Date.now()}_${Math.round(Math.random() * 1000)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// דיווח תקלה חדשה
router.post('/report', verifyToken, authorizeRoles('tenant', 'technician', 'manager'), reportFault);

// קבלת כל התקלות - מנהל בלבד
router.get('/all', verifyToken, authorizeRoles('manager'), getAllFaults);

// קבלת התקלות האישיות - דייר בלבד
router.get('/my', verifyToken, authorizeRoles('tenant'), getMyFaults);

// קבלת כל תקלות הבניין - לדייר - חייב להיות לפני /updates/:id
router.get('/building', verifyToken, authorizeRoles('tenant'), async (req, res) => {
  try {
    // מחזיר הכל - הסינון של סגורות נעשה בצד הלקוח
    const [faults] = await db.query(`
      SELECT f.*, u.full_name as reported_by_name
      FROM faults f
      LEFT JOIN users u ON f.reported_by = u.id
      ORDER BY 
        FIELD(f.urgency, 'high', 'medium', 'low'),
        f.created_at DESC
    `);
    res.status(200).json({ faults });
  } catch (err) {
    console.error('Get building faults error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// קבלת התקלות המוקצות - טכנאי בלבד
router.get('/assigned', verifyToken, authorizeRoles('technician'), getAssignedFaults);

// שיוך תקלה לטכנאי - מנהל בלבד
router.put('/assign', verifyToken, authorizeRoles('manager'), assignFault);

// עדכון סטטוס תקלה - טכנאי ומנהל
router.put('/status', verifyToken, authorizeRoles('technician', 'manager'), updateFaultStatus);

// קבלת היסטוריית עדכונים - חייב להיות אחרי כל הנתיבים הספציפיים
router.get('/updates/:id', verifyToken, authorizeRoles('manager', 'technician', 'tenant'), getFaultUpdates);

// העלאת תמונות לתקלה
router.post('/upload-images', verifyToken, authorizeRoles('tenant', 'technician', 'manager'), upload.array('images', 3), async (req, res) => {
  try {
    const { fault_id } = req.body;
    if (!fault_id) return res.status(400).json({ message: 'Fault ID required.' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    await db.query('UPDATE faults SET images = ? WHERE id = ?', [JSON.stringify(urls), fault_id]);
    res.status(200).json({ message: 'Images uploaded successfully!', urls });
  } catch (err) {
    console.error('Upload images error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// מחיקת תקלה - דייר ומנהל בלבד
router.delete('/delete/:id', verifyToken, authorizeRoles('tenant', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (user_role === 'tenant') {
      const [faults] = await db.query(
        'SELECT id FROM faults WHERE id = ? AND reported_by = ?',
        [id, user_id]
      );
      if (faults.length === 0) {
        return res.status(403).json({ message: 'You can only delete your own faults.' });
      }
    }

    await db.query('DELETE FROM faults WHERE id = ?', [id]);
    res.status(200).json({ message: 'Fault deleted successfully!' });

  } catch (err) {
    console.error('Delete fault error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;