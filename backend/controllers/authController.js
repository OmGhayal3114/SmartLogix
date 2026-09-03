const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { name, email, password, phone } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash: password, phone: phone || '' });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = signToken(user._id);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try { res.json({ user: req.user.toSafeJSON() }); } catch (err) { next(err); }
};

exports.logout = (req, res) => res.json({ message: 'Logged out successfully.' });

exports.updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    const allowed = ['en','hi','as','bn','brx','mni','kha','grt','lus','ne','kok'];
    if (!allowed.includes(language)) return res.status(400).json({ error: 'Invalid language code.' });
    req.user.preferredLanguage = language;
    await req.user.save();
    res.json({ message: 'Language preference updated.', language });
  } catch (err) { next(err); }
};
