const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// SSE clients list
let sseClients = [];

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    valid ? cb(null, true) : cb(new Error('Images only'));
  }
});

// Broadcast to all SSE clients
function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => client.res.write(payload));
}

// SSE endpoint
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { id: Date.now(), res };
  sseClients.push(client);
  console.log(`SSE client connected. Total: ${sseClients.length}`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== client.id);
    console.log(`SSE client disconnected. Total: ${sseClients.length}`);
  });
});

// POST — Submit new observation
router.post('/', upload.single('photo'), async (req, res) => {
  const { type, department, reported_by, description, immediate_action } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO observations 
        (type, department, reported_by, description, immediate_action, photo_path, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [type, department, reported_by || 'Anonymous', description, immediate_action, photo_path]
    );

    const newReport = result.rows[0];
    broadcast({ event: 'new_report', data: newReport });
    res.status(201).json({ success: true, data: newReport });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Submission failed' });
  }
});

// GET — Fetch all observations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM observations ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

// PATCH — Mark as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE observations SET status = 'resolved' 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    const updated = result.rows[0];
    broadcast({ event: 'report_resolved', data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

// DELETE — Remove an observation
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM observations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

module.exports = router;