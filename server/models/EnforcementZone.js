const mongoose = require('mongoose');

const enforcementZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['speed_enforcement', 'red_light_camera', 'parking_enforcement', 'helmet_enforcement'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Configure composite index for geospatial queries
enforcementZoneSchema.index({ latitude: 1, longitude: 1 });
enforcementZoneSchema.index({ type: 1 });

module.exports = mongoose.model('EnforcementZone', enforcementZoneSchema);
