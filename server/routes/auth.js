const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const Vehicle = require('../models/Vehicle');
const DriverDocument = require('../models/DriverDocument');
const RouteAnalysis = require('../models/RouteAnalysis');
const Fine = require('../models/Fine');
const MonthlyReport = require('../models/MonthlyReport');
const Notification = require('../models/Notification');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, username, phone } = req.body;
    
    // 1. Mandatory Fields Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    // 2. Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 3. Confirm Password Match
    if (req.body.confirmPassword !== undefined && password !== req.body.confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // 4. Password strength validation
    const pwd = password || '';
    const minLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({ message: 'Password does not meet strength requirements.' });
    }

    // 5. Uniqueness checks — email, username, phone
    // Email must always be unique (primary identity)
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({
        message: 'This email address is already registered.',
        field: 'email'
      });
    }

    // Username must be unique if provided (optional field)
    if (username && username.trim()) {
      const existingUsername = await User.findOne({ username: username.trim() });
      if (existingUsername) {
        return res.status(409).json({
          message: 'This username is already taken. Please choose another.',
          field: 'username'
        });
      }
    }

    // Phone must be unique if provided (optional field)
    // NOTE: Full name (name field) is intentionally NOT checked for uniqueness
    // Multiple legitimate users may share the same real name (e.g. "Arun Kumar")
    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(409).json({
          message: 'This phone number is already linked to an existing account.',
          field: 'phone'
        });
      }
    }

    // 6. Phone format validation
    if (phone && phone.trim()) {
      const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({ message: 'Invalid phone number format.' });
      }
    }

    const isVerificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === 'true';
    const verified = !isVerificationRequired;

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      username: username?.trim() || null,
      phone: phone?.trim() || null,
      emailVerified: verified,
      emailVerifiedAt: verified ? new Date() : null
    });

    let verificationToken = null;
    if (!verified) {
      verificationToken = crypto.randomBytes(20).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
    }

    user.lastLogin = new Date();
    user.sessionInfo = {
      device: req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      loginTime: new Date()
    };
    
    await user.save();

    if (!verified && verificationToken) {
      await emailService.sendVerificationEmail(user, verificationToken);
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email before signing in.',
        emailVerified: false,
        email: user.email
      });
    } else {
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, username: user.username, phone: user.phone, emailVerified: true }
      });
    }
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isVerificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === 'true';
    if (isVerificationRequired && !user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        emailVerified: false,
        email: user.email
      });
    }

    user.lastLogin = new Date();
    user.sessionInfo = {
      device: req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      loginTime: new Date()
    };
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, username: user.username, phone: user.phone, emailVerified: user.emailVerified } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. Get User Profile with Preferences
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 4. Update Notification Settings Preferences
router.put('/notification-settings', auth, async (req, res) => {
  try {
    const { enabled, emailReminders, dashboardAlerts, reminderPreferences } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }

    if (enabled !== undefined) user.notificationSettings.enabled = enabled;
    if (emailReminders !== undefined) user.notificationSettings.emailReminders = emailReminders;
    if (dashboardAlerts !== undefined) user.notificationSettings.dashboardAlerts = dashboardAlerts;
    if (reminderPreferences !== undefined) user.notificationSettings.reminderPreferences = reminderPreferences;

    await user.save();
    
    res.json({ success: true, message: "Notification preferences updated successfully.", settings: user.notificationSettings });
  } catch (error) {
    console.error("Notification settings update failure:", error);
    res.status(500).json({ message: 'Server error saving preferences.' });
  }
});

// 5. Log viewed learning module
router.post('/learning/view', auth, async (req, res) => {
  try {
    const { moduleId } = req.body;
    if (!moduleId) {
      return res.status(400).json({ message: 'Missing moduleId.' });
    }

    const User = require('../models/User');
    const complianceEngine = require('../services/complianceEngine');
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.learningModulesViewed.includes(moduleId)) {
      user.learningModulesViewed.push(moduleId);
      await user.save();
    }

    const updated = await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, user, scores: updated });
  } catch (error) {
    console.error("Learning progress view logging failure:", error);
    res.status(500).json({ message: 'Server error logging progress.' });
  }
});

// 7. Get full compliance telemetry metrics
router.get('/telemetry', auth, async (req, res) => {
  try {
    const complianceEngine = require('../services/complianceEngine');
    const data = await complianceEngine.recalculateUserComplianceScores(req.userId);
    res.json({ success: true, telemetry: data });
  } catch (error) {
    console.error("Telemetry fetch failure:", error);
    res.status(500).json({ message: 'Server error compiling compliance telemetry.' });
  }
});

// 8. Update Profile Details (Name & Avatar)
router.put('/profile/update', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// 9. Update Password
router.put('/profile/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: 'Server error updating password.' });
  }
});

// 10. Get Profile Statistics (Counts across collections)
router.get('/profile/statistics', auth, async (req, res) => {
  try {
    const vehiclesCount = await Vehicle.countDocuments({ userId: req.userId });
    const documentsCount = await DriverDocument.countDocuments({ userId: req.userId });
    const routesCount = await RouteAnalysis.countDocuments({ userId: req.userId });
    const finesCount = await Fine.countDocuments({ userId: req.userId });
    const reportsCount = await MonthlyReport.countDocuments({ userId: req.userId });
    const notificationsCount = await Notification.countDocuments({ userId: req.userId });
    
    const user = await User.findById(req.userId);
    const aiChatsCount = user?.trafficAssistantChatsCount || 0;

    res.json({
      success: true,
      statistics: {
        vehicles: vehiclesCount,
        documents: documentsCount,
        routes: routesCount,
        challans: finesCount,
        aiChats: aiChatsCount,
        reports: reportsCount,
        notifications: notificationsCount
      }
    });
  } catch (error) {
    console.error("Statistics compilation error:", error);
    res.status(500).json({ message: 'Server error compiling profile statistics.' });
  }
});

// 11. Get Profile Activities (Recent items across collections)
router.get('/profile/activity', auth, async (req, res) => {
  try {
    const recentRoutes = await RouteAnalysis.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5);
    const recentFines = await Fine.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5);
    const recentNotifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5);
    
    const user = await User.findById(req.userId);
    const recentLearning = user?.learningModulesViewed || [];

    res.json({
      success: true,
      activity: {
        routes: recentRoutes,
        fines: recentFines,
        notifications: recentNotifications,
        learning: recentLearning
      }
    });
  } catch (error) {
    console.error("Activity compilation error:", error);
    res.status(500).json({ message: 'Server error compiling profile activities.' });
  }
});

// 12. Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email });
    
    // Safety requirement: Never expose user existence. Always show success response.
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.'
      });
    }

    // Generate secure random 20-byte token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token using SHA-256 for secure storage
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes window
    await user.save();

    // Send reset email with unhashed token
    await emailService.sendResetPasswordEmail(user, resetToken);

    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.'
    });
  } catch (error) {
    console.error("Forgot password failure:", error);
    res.status(500).json({ message: 'Server error processing password recovery.' });
  }
});

// 13. Reset Password Route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    // Hash incoming token using SHA-256 to compare with stored value
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    // Update password (pre-save handles bcrypt hashing) and clear reset token details
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful.'
    });
  } catch (error) {
    console.error("Reset password failure:", error);
    res.status(500).json({ message: 'Server error processing password reset.' });
  }
});

// Verification email request (resend)
const resendVerificationHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success regardless to prevent user enumeration
      return res.json({
        success: true,
        message: 'If the email exists, a verification link has been sent.'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    await emailService.sendVerificationEmail(user, verificationToken);

    res.json({
      success: true,
      message: 'If the email exists, a verification link has been sent.'
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: 'Server error processing verification request.' });
  }
};

router.post('/verify-email-request', resendVerificationHandler);
router.post('/resend-verification', resendVerificationHandler);

// GET verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully.'
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: 'Server error processing email verification.' });
  }
});

module.exports = router;
