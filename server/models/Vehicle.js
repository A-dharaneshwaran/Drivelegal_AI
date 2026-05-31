const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plateNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  vehicleName: {
    type: String,
    trim: true
  },
  vehicleType: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  insuranceStatus: {
    type: String,
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Normalize plate number formatting prior to validation (TN-05-AB-1234 format) and set registrationNumber
vehicleSchema.pre('validate', function() {
  if (this.plateNumber) {
    this.plateNumber = this.plateNumber.toUpperCase().replace(/\s+/g, '-');
    this.registrationNumber = this.plateNumber.replace(/[-\s]/g, '');
  }
  if (!this.vehicleName && this.make && this.model) {
    this.vehicleName = `${this.make} ${this.model}`;
  }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
