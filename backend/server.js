require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const alertCron = require('./jobs/alertCron');

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const routeRoutes = require('./routes/routes');
const facilityRoutes = require('./routes/facilities');
const alertRoutes = require('./routes/alerts');
const mlRoutes = require('./routes/ml');
const feedbackRoutes = require('./routes/feedback');
const configRoutes = require('./routes/config');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serverless-friendly cached DB connection
let cachedDbPromise = null;
async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  if (!cachedDbPromise) {
    cachedDbPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false
    }).then(() => {
      console.log('✓ MongoDB connected');
      if (!process.env.VERCEL) alertCron.start();
    }).catch(err => {
      cachedDbPromise = null;
      throw err;
    });
  }
  await cachedDbPromise;
}

// Ensure DB is connected before handling API routes
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/config/maps-key') {
    return next();
  }
  try {
    await ensureDbConnected();
    next();
  } catch (e) {
    console.error('[DB Error]', e.message);
    return res.status(503).json({
      error: 'Database connection failed: ' + e.message + '. Please ensure 0.0.0.0/0 is added to your MongoDB Atlas IP Access List.'
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

// Error handler MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n◉ NER SmartLogix backend running on http://localhost:${PORT}`);
    ensureDbConnected();
  });
}

module.exports = app;
