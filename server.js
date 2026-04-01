require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const observationsRouter = require('./routes/observations');

const app = express();
const PORT = process.env.PORT || 3008;

// Auto-detect local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/observations', observationsRouter);

// /api/qrcode — returns QR as data URL
app.get('/api/qrcode', async (req, res) => {
  try {
    const url = `http://${LOCAL_IP}:${PORT}/log`;
    const qr = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#243547',
        light: '#ffffff'
      }
    });
    res.json({ success: true, qr, url });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

// /log — employee form
app.get('/log', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// /admin — dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// /qr — poster page
app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

// / — redirect root to /log
app.get('/', (req, res) => {
  res.redirect('/log');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('----------------------------------------');
  console.log(`  Clamason Observation Logger`);
  console.log(`  Logger:  http://${LOCAL_IP}:${PORT}/log`);
  console.log(`  Admin:   http://${LOCAL_IP}:${PORT}/admin`);
  console.log(`  QR Code: http://${LOCAL_IP}:${PORT}/qr`);
  console.log('----------------------------------------');
});