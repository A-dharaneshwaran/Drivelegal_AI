const Vehicle = require('../models/Vehicle');
const DriverDocument = require('../models/DriverDocument');
const complianceEngine = require('../services/complianceEngine');

/**
 * Creates a new vehicle registration profile.
 */
const createVehicle = async (req, res, next) => {
  try {
    const { plateNumber, make, model, fuelType, year, vehicleName, vehicleType, color, insuranceStatus, additionalNotes } = req.body;
    if (!plateNumber || !make || !model || !fuelType || !year) {
      return res.status(400).json({ success: false, message: 'Missing vehicle metadata.' });
    }

    const registrationYear = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (isNaN(registrationYear) || registrationYear < 1914 || registrationYear > maxYear) {
      return res.status(400).json({
        success: false,
        message: `If this vehicle was registered in India, the registration year must be between 1914 and ${maxYear}.`
      });
    }

    const normalizedRegNo = plateNumber.toUpperCase().replace(/[-\s]/g, '');
    const existing = await Vehicle.findOne({ registrationNumber: normalizedRegNo });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This registration number is already registered.'
      });
    }

    const formattedPlate = plateNumber.toUpperCase().replace(/\s+/g, '-');

    const vehicle = new Vehicle({
      userId: req.userId,
      plateNumber: formattedPlate,
      make,
      model,
      fuelType,
      year: registrationYear,
      vehicleName: vehicleName || `${make} ${model}`,
      vehicleType,
      color,
      insuranceStatus,
      additionalNotes
    });

    await vehicle.save();

    // Trigger score update as a new vehicle might introduce document voids (Missing RC, PUC, Insurance)
    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully.',
      vehicle,
      scores: updatedScores
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This registration number is already registered.'
      });
    }
    next(error);
  }
};

/**
 * Updates a registered vehicle.
 */
const updateVehicle = async (req, res, next) => {
  try {
    const { registrationNumber, plateNumber, make, model, fuelType, year, vehicleName, vehicleType, color, insuranceStatus, additionalNotes } = req.body;
    const vehicleId = req.params.id;

    const inputPlate = registrationNumber || plateNumber;
    if (!inputPlate || !make || !model || !fuelType || !year) {
      return res.status(400).json({ success: false, message: 'Missing vehicle metadata.' });
    }

    if (!vehicleName || !vehicleName.trim()) {
      return res.status(400).json({ success: false, message: 'Vehicle name is required.' });
    }

    const registrationYear = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (isNaN(registrationYear) || registrationYear < 1914 || registrationYear > maxYear) {
      return res.status(400).json({
        success: false,
        message: `If this vehicle was registered in India, the registration year must be between 1914 and ${maxYear}.`
      });
    }

    const normalizedRegNo = inputPlate.toUpperCase().replace(/[-\s]/g, '');
    const duplicate = await Vehicle.findOne({
      registrationNumber: normalizedRegNo,
      _id: { $ne: vehicleId }
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This registration number is already registered.'
      });
    }

    const formattedPlate = inputPlate.toUpperCase().replace(/\s+/g, '-');

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, userId: req.userId },
      {
        plateNumber: formattedPlate,
        make,
        model,
        fuelType,
        year: registrationYear,
        vehicleName,
        vehicleType,
        color,
        insuranceStatus,
        additionalNotes
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Recalculate scores as the vehicle modification may affect compliance
    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    res.json({
      success: true,
      message: 'Vehicle updated successfully.',
      vehicle,
      scores: updatedScores
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This registration number is already registered.'
      });
    }
    next(error);
  }
};

/**
 * Lists all registered vehicles.
 */
const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.json({ success: true, vehicles });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a registered vehicle.
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, userId: req.userId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Unlink vehicle from any documents
    await DriverDocument.updateMany(
      { userId: req.userId, vehicleId: vehicle._id },
      { $unset: { vehicleId: "" } }
    );

    await Vehicle.findByIdAndDelete(vehicle._id);

    const updatedScores = await complianceEngine.recalculateUserComplianceScores(req.userId);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully.',
      scores: updatedScores
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVehicle,
  updateVehicle,
  listVehicles,
  deleteVehicle
};
