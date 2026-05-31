const mongoose = require('mongoose');

const accidentHotspotSchema = new mongoose.Schema({
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
  severity: {
    type: String,
    enum: ['Moderate', 'High', 'Critical'],
    default: 'High'
  },
  accidentCount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create spatial index for fast geospatial coordinate queries
accidentHotspotSchema.index({ latitude: 1, longitude: 1 });
accidentHotspotSchema.index({ state: 1 });

module.exports = mongoose.model('AccidentHotspot', accidentHotspotSchema);
