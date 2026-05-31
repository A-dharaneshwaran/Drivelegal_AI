const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['fine_due', 'fine_overdue', 'payment_confirmed', 'route_alert', 'system'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  relatedFineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine',
    default: null
  }
}, {
  timestamps: true
});

// Production indexes
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
