const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feedbackController = require('../controllers/feedbackController');
const { optionalAuth } = require('../middleware/auth');

router.post('/',
  optionalAuth,
  [body('message').trim().notEmpty().withMessage('Feedback message is required').isLength({ max: 2000 }).withMessage('Feedback is too long')],
  feedbackController.submitFeedback
);

module.exports = router;
