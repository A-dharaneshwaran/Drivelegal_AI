const Fine = require('../models/Fine');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ocrService = require('../services/ocrService');
const fineParser = require('../utils/fineParser');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const complianceEngine = require('../services/complianceEngine');

/**
 * Manually logs a traffic violation ticket.
 */
const createFineManual = async (req, res, next) => {
  try {
    const {
      fineNumber,
      vehicleNumber,
      violationType,
      issueDate,
      dueDate,
      amount,
      location,
      description,
      reminderStatus
    } = req.body;

    if (!fineNumber || !vehicleNumber || !violationType || !issueDate || !dueDate || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required challenge parameters.' });
    }

    // Prevent future issue dates — a traffic fine cannot be issued in the future
    const issueDateObj = new Date(issueDate);
    const todayStart = new Date();
    todayStart.setHours(23, 59, 59, 999); // Allow up to end of today
    if (isNaN(issueDateObj.getTime()) || issueDateObj > todayStart) {
      return res.status(400).json({
        success: false,
        message: 'Fine issue date cannot be in the future.'
      });
    }

    // Auto-calculate reminder dates (7d, 3d, 1d)
    const reminderDays = [7, 3, 1, 0];
    const reminderDates = reminderDays.map(days => {
      const d = new Date(dueDate);
      d.setDate(d.getDate() - days);
      return d;
    });

    let status = 'Pending';
    if (new Date(dueDate) < new Date()) {
      status = 'Overdue';
    }

    const fine = new Fine({
      userId: req.userId,
      fineNumber,
      vehicleNumber: vehicleNumber.toUpperCase().replace(/\s+/g, '-'),
      violationType,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      amount: Number(amount),
      location: location || '',
      description: description || '',
      status,
      reminderStatus: reminderStatus || 'Enabled',
      reminderDates,
      nextReminderDate: reminderDates[0] // Set initial reminder alarm trigger
    });

    await fine.save();
    
    // Create in-app fine_due Notification
    const user = await User.findById(req.userId);
    if (user) {
      if (user.notificationSettings?.enabled !== false && (!user.notificationSettings || user.notificationSettings.dashboardAlerts)) {
        const notification = new Notification({
          userId: req.userId,
          title: "New Traffic Challan Logged",
          message: `A new traffic fine of ₹${fine.amount} for vehicle ${fine.vehicleNumber} has been logged. Due date: ${new Date(fine.dueDate).toLocaleDateString()}.`,
          type: "fine_due",
          priority: "medium",
          relatedFineId: fine._id
        });
        await notification.save();
      }

      // Trigger initial email alert if due within 7 days
      const diffDays = Math.ceil((new Date(fine.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7 && user.notificationSettings?.enabled !== false && (!user.notificationSettings || user.notificationSettings.emailReminders)) {
        try {
          await emailService.sendFineDueEmail(user, fine, diffDays);
        } catch (mailError) {
          console.error("[MAIL DELIVERY ERROR] Failed to send initial due email:", mailError.message);
        }
      }
    }
    
    console.log("Challan logged manually. ID:", fine._id);
    await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.status(201).json({ success: true, fine });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles real OCR file processing using Multer -> Tesseract.js -> Regex -> Gemini AI structure enhancement.
 */
const processOcrChallan = async (req, res, next) => {
  try {
    // 1. Multer receives file
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received for OCR scanning.' });
    }

    console.log("File received");
    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    // 2. OCR text extraction from buffer
    const rawText = await ocrService.extractTextFromBuffer(req.file.buffer);

    // 3. Parser/Regex extracts fields
    const parsedRegexFields = fineParser.parseOcrText(rawText);

    // 4. Gemini AI optionally improves ambiguous extracted data
    let refinedData = parsedRegexFields;
    try {
      if (process.env.GEMINI_API_KEY) {
        refinedData = await aiService.improveExtractedFields(parsedRegexFields);
      }
    } catch (aiError) {
      console.warn("Gemini refinement failed (falling back to raw Regex fields):", aiError.message);
    }

    console.log("Parsed fields", refinedData);

    // 5. Return clean dynamic data
    console.log("Response sent");
    res.json({
      success: true,
      data: {
        fineNumber: refinedData.fineNumber || "",
        vehicleNumber: refinedData.vehicleNumber || "",
        amount: refinedData.amount || "",
        violationType: refinedData.violationType || "",
        issueDate: refinedData.issueDate || "",
        dueDate: refinedData.dueDate || "",
        location: refinedData.location || "",
        description: refinedData.description || ""
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Lists all fines for the user with filters and sorting options.
 */
const listFines = async (req, res, next) => {
  try {
    const { status, vehicleNumber, sortBy } = req.query;
    const query = { userId: req.userId };
    
    if (status) {
      query.status = status;
    }
    if (vehicleNumber) {
      query.vehicleNumber = { $regex: vehicleNumber, $options: 'i' };
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'highestAmount') {
      sortOptions = { amount: -1 };
    } else if (sortBy === 'lowestAmount') {
      sortOptions = { amount: 1 };
    } else if (sortBy === 'dueSoon') {
      sortOptions = { dueDate: 1 };
    }

    // Refresh overdue statuses dynamically
    const now = new Date();
    await Fine.updateMany(
      { userId: req.userId, status: 'Pending', dueDate: { $lt: now } },
      { $set: { status: 'Overdue' } }
    );

    const fines = await Fine.find(query).sort(sortOptions);
    res.json({ success: true, fines });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches analytics, trends, and scheduled alerts history.
 */
const getFineAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Refresh overdue statuses
    await Fine.updateMany(
      { userId: req.userId, status: 'Pending', dueDate: { $lt: now } },
      { $set: { status: 'Overdue' } }
    );

    const fines = await Fine.find({ userId: req.userId });

    let totalAmountDue = 0;
    let totalFines = fines.length;
    let pendingCount = 0;
    let paidCount = 0;
    let overdueCount = 0;

    fines.forEach(f => {
      if (f.status === 'Pending') {
        pendingCount++;
        totalAmountDue += f.amount;
      } else if (f.status === 'Paid') {
        paidCount++;
      } else if (f.status === 'Overdue') {
        overdueCount++;
        totalAmountDue += f.amount;
      }
    });

    // Compute monthly trends
    const trendsMap = {};
    fines.forEach(f => {
      if (!f.issueDate) return;
      const monthLabel = f.issueDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!trendsMap[monthLabel]) {
        trendsMap[monthLabel] = { month: monthLabel, amount: 0, count: 0 };
      }
      trendsMap[monthLabel].amount += f.amount;
      trendsMap[monthLabel].count += 1;
    });

    const monthlyTrends = Object.values(trendsMap);

    // Compute dynamic notification alerts to display on frontend dashboard
    const reminderAlerts = [];
    fines.forEach(f => {
      if (f.status === 'Paid' || f.reminderStatus === 'Disabled') return;

      const diffDays = Math.ceil((new Date(f.dueDate) - now) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        reminderAlerts.push({
          fineId: f._id,
          type: 'Overdue Alert',
          message: `Your traffic fine of ₹${f.amount} for vehicle ${f.vehicleNumber} is OVERDUE by ${Math.abs(diffDays)} day(s).`,
          severity: 'high'
        });
      } else if (diffDays === 0) {
        reminderAlerts.push({
          fineId: f._id,
          type: 'Due Today',
          message: `Your traffic fine of ₹${f.amount} for vehicle ${f.vehicleNumber} is due TODAY!`,
          severity: 'high'
        });
      } else if (diffDays <= 7) {
        reminderAlerts.push({
          fineId: f._id,
          type: `${diffDays} Days Remaining`,
          message: `Your traffic fine of ₹${f.amount} for vehicle ${f.vehicleNumber} is due in ${diffDays} day(s).`,
          severity: diffDays === 1 ? 'medium' : 'low'
        });
      }
    });

    res.json({
      success: true,
      analytics: {
        totalFines,
        pendingCount,
        paidCount,
        overdueCount,
        totalAmountDue,
        monthlyTrends,
        reminderAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches fine details by ID.
 */
const getFineById = async (req, res, next) => {
  try {
    const fine = await Fine.findOne({ _id: req.params.id, userId: req.userId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }
    res.json({ success: true, fine });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates challan details and recalculates schedules.
 */
const updateFine = async (req, res, next) => {
  try {
    const fine = await Fine.findOne({ _id: req.params.id, userId: req.userId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    const {
      fineNumber,
      vehicleNumber,
      violationType,
      issueDate,
      dueDate,
      amount,
      location,
      description,
      reminderStatus
    } = req.body;

    if (fineNumber) fine.fineNumber = fineNumber;
    if (vehicleNumber) fine.vehicleNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '-');
    if (violationType) fine.violationType = violationType;
    if (issueDate) {
      const issueDateObj = new Date(issueDate);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      if (isNaN(issueDateObj.getTime()) || issueDateObj > todayEnd) {
        return res.status(400).json({
          success: false,
          message: 'Fine issue date cannot be in the future.'
        });
      }
      fine.issueDate = issueDateObj;
    }
    if (dueDate) {
      fine.dueDate = new Date(dueDate);
      const reminderDays = [7, 3, 1, 0];
      fine.reminderDates = reminderDays.map(days => {
        const d = new Date(dueDate);
        d.setDate(d.getDate() - days);
        return d;
      });
      fine.nextReminderDate = fine.reminderDates[0];
      if (fine.status !== 'Paid') {
        fine.status = new Date(dueDate) < new Date() ? 'Overdue' : 'Pending';
      }
    }
    if (amount) fine.amount = Number(amount);
    if (location !== undefined) fine.location = location;
    if (description !== undefined) fine.description = description;
    if (reminderStatus) fine.reminderStatus = reminderStatus;

    await fine.save();
    await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, fine });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a fine as paid and logs transaction details.
 */
const settleFinePaid = async (req, res, next) => {
  try {
    const fine = await Fine.findOne({ _id: req.params.id, userId: req.userId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const { paymentDate, paymentNote, receiptImage } = req.body;

    fine.status = 'Paid';
    fine.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    fine.paymentNote = paymentNote || '';
    if (receiptImage) fine.receiptImage = receiptImage;
    
    // Settle reminder daemons
    fine.reminderStatus = 'Disabled';
    fine.notificationStatus = 'Disabled';

    await fine.save();
    
    // Create in-app payment_confirmed Notification
    const user = await User.findById(req.userId);
    if (user) {
      if (user.notificationSettings?.enabled !== false && (!user.notificationSettings || user.notificationSettings.dashboardAlerts)) {
        const notification = new Notification({
          userId: req.userId,
          title: "Challan Payment Confirmed",
          message: `Your payment of ₹${fine.amount} for challan ${fine.fineNumber} has been successfully settled and confirmed.`,
          type: "payment_confirmed",
          priority: "high",
          relatedFineId: fine._id
        });
        await notification.save();
      }

      // Trigger SMTP payment confirmation email
      if (user.notificationSettings?.enabled !== false && (!user.notificationSettings || user.notificationSettings.emailReminders)) {
        try {
          await emailService.sendPaymentConfirmationEmail(user, fine);
        } catch (mailError) {
          console.error("[MAIL DELIVERY ERROR] Failed to send payment confirmation email:", mailError.message);
        }
      }
    }
    
    console.log("Fine marked paid & alerts disabled. Challan ID:", fine._id);
    await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, fine });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes fine documents.
 */
const deleteFine = async (req, res, next) => {
  try {
    const fine = await Fine.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }
    await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, message: 'Fine record successfully deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFineManual,
  processOcrChallan,
  listFines,
  getFineAnalytics,
  getFineById,
  updateFine,
  settleFinePaid,
  deleteFine
};
