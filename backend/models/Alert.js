const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, enum: ['Assam','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Sikkim','Tripura','NER General','Unknown'], default: 'Unknown' },
  severity: { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], default: 'MEDIUM' },
  alertType: { type: String, enum: ['Landslide','Flood','Road Blockage','Road Closure','Heavy Rainfall','Bridge Damage','Traffic Disruption','Infrastructure Damage','Weather','Other'], default: 'Other' },
  source: { type: String, default: 'Unknown' },
  sourceUrl: { type: String, default: '' },
  coordinates: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
  priorityScore: { type: Number, default: 0 },
  status: { type: String, enum: ['active','resolved','monitoring'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

alertSchema.index({ priorityScore: -1, createdAt: -1 });
alertSchema.index({ status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
