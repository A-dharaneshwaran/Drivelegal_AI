const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fineNumber: {
    type: String,
    required: true,
    index: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  violationType: {
    type: String,
    required: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue'],
    default: 'Pending'
  },
  billImage: {
    type: String, // Stored as base64 or URL
    default: ''
  },
  extractedText: {
    type: String,
    default: ''
  },
  reminderStatus: {
    type: String,
    enum: ['Enabled', 'Disabled'],
    default: 'Enabled'
  },
  reminderDates: {
    type: [Date],
    default: []
  },
  lastReminderSent: {
    type: Date,
    default: null
  },
  nextReminderDate: {
    type: Date,
    default: null
  },
  notificationStatus: {
    type: String,
    enum: ['Pending', 'Sent', 'Failed', 'Disabled'],
    default: 'Pending'
  },
  reminderHistory: [{
    sentAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String
    },
    message: {
      type: String
    }
  }],
  paymentDate: {
    type: Date
  },
  paymentNote: {
    type: String,
    default: ''
  },
  receiptImage: {
    type: String, // Stored as base64 or URL
    default: ''
  }
}, {
  timestamps: true
});

// Production performance indexes
fineSchema.index({ userId: 1 });
fineSchema.index({ dueDate: 1 });
fineSchema.index({ status: 1 });

// Unique compound constraint to prevent logging the same challan number twice for a user
fineSchema.index({ userId: 1, fineNumber: 1 }, { unique: true });

module.exports = mongoose.model('Fine', fineSchema);
