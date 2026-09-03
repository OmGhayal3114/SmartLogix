const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  message: { type: String, required: [true, 'Feedback message is required'], trim: true, maxlength: [2000, 'Feedback too long'] },
  category: { type: String, enum: ['route_issue','facility_issue','alert_issue','general','other'], default: 'general' },
  location: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
