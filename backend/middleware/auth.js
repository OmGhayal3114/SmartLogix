const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'ner_smartlogix_super_secret_jwt_key_2026';

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ error: 'Please log in to access this resource.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please log in again.' });
    next(err);
  }
};

exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (err) { /* silent */ }
  next();
};
