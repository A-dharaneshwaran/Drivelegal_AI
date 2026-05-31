const mongoose = require('mongoose');

const routeAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  distance: {
    type: Number, // in kilometers
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  riskScore: {
    type: Number,
    required: true
  },
  safetyScore: {
    type: Number,
    required: true
  },
  weatherRisk: {
    type: Number,
    default: 0
  },
  trafficRisk: {
    type: Number,
    default: 0
  },
  fatigueRisk: {
    type: Number,
    default: 0
  },
  hotspotRisk: {
    type: Number,
    default: 0
  },
  legalComplianceRisk: {
    type: Number,
    default: 0
  },
  analysisConfidence: {
    type: Number,
    default: 100
  },
  departureOptimization: {
    type: Object, // holds { recommendedTime, reason }
    required: true
  },
  aiAnalysis: {
    type: Object, // Stores structured Gemini review payload (Summary, Explanation, alternative routes, etc.)
    required: true
  }
}, {
  timestamps: true
});

routeAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RouteAnalysis', routeAnalysisSchema);
