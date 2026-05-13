// ייבוא חבילות נדרשות
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/DB');

// ייבוא נתיבים
const authRoutes = require('./routes/authRoutes');
const faultRoutes = require('./routes/faultRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const energyRoutes = require('./routes/energyRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const alertsRoutes = require('./routes/alertsRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// הגשת קבצי Frontend
app.use(express.static('C:\\buildix\\frontend'));

// חיבור נתיבים
app.use('/api/auth', authRoutes);
app.use('/api/faults', faultRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/alerts', alertsRoutes);

app.get('/', (req, res) => {
  res.sendFile('C:\\buildix\\frontend\\index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});