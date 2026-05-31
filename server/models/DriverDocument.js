const mongoose = require('mongoose');

const driverDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: false,
    index: true
  },
  documentType: {
    type: String,
    enum: ['DL', 'RC', 'Insurance', 'PUC'],
    required: true
  },
  documentNumber: {
    type: String,
    trim: true,
    default: ''
  },
  issueDate: {
    type: Date,
    required: false
  },
  expiryDate: {
    type: Date,
    required: false
  },
  fileUrl: {
    type: String,
    default: ''
  },
  ocrExtractedData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  confidences: {
    documentNumber: { type: Number, default: 0 },
    issueDate: { type: Number, default: 0 },
    expiryDate: { type: Number, default: 0 },
    vehicleNumber: { type: Number, default: 0 },
    holderName: { type: Number, default: 0 },
    ownerName: { type: Number, default: 0 },
    policyNumber: { type: Number, default: 0 },
    certificateNumber: { type: Number, default: 0 },
    insurerName: { type: Number, default: 0 },
    overallOcr: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['Valid', 'Expiring Soon', 'Expired', 'Unusual Validity'],
    default: 'Valid'
  }
}, { timestamps: true });

// Index to speed up scanning near-expiry documents
driverDocumentSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model('DriverDocument', driverDocumentSchema);
