const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: String, // Format: "May 2026", "June 2026"
    required: true
  },
  complianceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  awarenessScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  travelReadinessScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  violationRiskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  documentStatus: {
    type: Map,
    of: String, // e.g. { "DL": "Valid", "RC": "Expired" }
    default: {}
  },
  pendingFinesCount: {
    type: Number,
    default: 0
  },
  routesAnalyzedCount: {
    type: Number,
    default: 0
  },
  learningProgressCount: {
    type: Number,
    default: 0
  },
  aiChatsCount: {
    type: Number,
    default: 0
  },
  recommendations: {
    type: [String],
    default: []
  }
}, { timestamps: true });

// Compound index to guarantee uniqueness of one report card per user per month
monthlyReportSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyReport', monthlyReportSchema);
