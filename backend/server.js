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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let dbConnected = false;

// Middleware: block API routes (except health & config) when DB is down
app.use('/api', (req, res, next) => {
  const allowed = ['/api/health', '/api/config/maps-key'];
  if (!dbConnected && !allowed.some(p => req.path.startsWith(p.replace('/api', '')))) {
    return res.status(503).json({
      error: 'Database not connected. Please start MongoDB and restart the server.',
      hint: 'Run: mongod  (in a separate terminal)'
    });
  }
  next();
});

// Start server immediately so health endpoint works even without MongoDB
const server = app.listen(PORT, () => {
  console.log(`\n◉ NER SmartLogix backend running on http://localhost:${PORT}`);
  console.log('  Connecting to MongoDB...');
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    dbConnected = true;
    console.log('✓ MongoDB connected');
    alertCron.start();
  })
  .catch(err => {
    console.error('\n✗ MongoDB connection failed:', err.message);
    console.error('  → Make sure MongoDB is running: mongod');
    console.error('  → Or update MONGODB_URI in .env to use MongoDB Atlas\n');
    // Server stays up — returns 503 on DB-dependent routes
  });

module.exports = app;

