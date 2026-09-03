const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripId: { type: String, default: () => 'TRP-' + Date.now(), unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  origin: { type: String, required: [true, 'Origin is required'], trim: true },
  destination: { type: String, required: [true, 'Destination is required'], trim: true },
  vehicleType: { type: String, required: [true, 'Vehicle type is required'], enum: ['Truck','Heavy Truck','Mini Truck','Cargo Van','Pickup','Refrigerated Truck','Tanker'] },
  route: { summary: String, steps: [String], polyline: String },
  distance: { type: String, default: '' },
  estimatedTime: { type: String, default: '' },
  riskLevel: { type: String, enum: ['LOW','MEDIUM','HIGH','UNKNOWN'], default: 'UNKNOWN' },
  riskReason: { type: String, default: '' },
  status: { type: String, enum: ['planned','in-progress','completed','cancelled'], default: 'planned' }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
