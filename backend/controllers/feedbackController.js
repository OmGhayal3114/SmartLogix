const { validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');

exports.submitFeedback = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { message, category, location } = req.body;

    const feedback = await Feedback.create({
      userId: req.user ? req.user._id : null,
      message,
      category: category || 'general',
      location: location || ''
    });

    res.status(201).json({
      message: 'Thank you! Your feedback has been submitted.',
      feedbackId: feedback._id
    });
  } catch (err) {
    next(err);
  }
};
