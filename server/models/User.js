const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  tripHistory: [{
    startLocation: String,
    endLocation: String,
    date: Date,
    distance: Number
  }],
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    emailReminders: { type: Boolean, default: true },
    dashboardAlerts: { type: Boolean, default: true },
    reminderPreferences: {
      type: [String],
      default: ['7_days', '3_days', '1_day', 'due_date', 'overdue']
    }
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date
  },
  sessionInfo: {
    device: String,
    ip: String,
    loginTime: Date
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  complianceScore: {
    type: Number,
    default: 100
  },
  complianceContributors: {
    type: [String],
    default: []
  },
  awarenessScore: {
    type: Number,
    default: 0
  },
  travelReadinessScore: {
    type: Number,
    default: 100
  },
  violationRiskScore: {
    type: Number,
    default: 10
  },
  learningModulesViewed: {
    type: [String],
    default: []
  },
  // @deprecated - Kept for legacy compatibility / historical reporting
  quizCompletionCount: {
    type: Number,
    default: 0
  },
  trafficAssistantChatsCount: {
    type: Number,
    default: 0
  },
  username: {
    type: String,
    default: null,
    unique: true,
    sparse: true  // sparse=true allows multiple null values while still enforcing uniqueness for non-null entries
  },
  phone: {
    type: String,
    default: null,
    unique: true,
    sparse: true  // sparse=true allows multiple null values while still enforcing uniqueness for non-null entries
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
