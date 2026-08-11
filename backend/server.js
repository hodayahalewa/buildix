const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const db = require('./config/DB');

const authRoutes = require('./routes/authRoutes');
const faultRoutes = require('./routes/faultRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const energyRoutes = require('./routes/energyRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// הגשת וידאו — חייב להיות לפני static!
app.get('/bg-video.mp4', (req, res) => {
  const videoPath = path.join('C:\\buildix\\frontend', 'bg-video.mp4');

  if (!fs.existsSync(videoPath)) {
    console.log('Video not found at:', videoPath);
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  console.log('Serving video, size:', fileSize, 'range:', range);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// הגשת קבצי Frontend
app.use(express.static('C:\\buildix\\frontend'));
app.use('/images', express.static('C:\\buildix\\frontend\\images'));

// גישה לתיקיית קבצים מועלים
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// חיבור נתיבים
app.use('/api/auth', authRoutes);
app.use('/api/faults', faultRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.sendFile('C:\\buildix\\frontend\\index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});