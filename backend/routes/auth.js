const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, rateLimit, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// Relaxed rate limiting for development
router.post('/register', rateLimit(15 * 60 * 1000, process.env.NODE_ENV === 'production' ? 5 : 50), asyncHandler(async (req, res) => {
  const { fullName, email, password, role, department, companyName, walletAddress } = req.body;
  
  // Validate required fields
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }
  
  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }
  
  // Create user
  const user = await User.create({
    fullName,
    email,
    password,
    role,
    department,
    companyName,
    walletAddress
  });
  
  // Generate token
  const token = user.getSignedJwtToken();
  
  // Create welcome notification
  await Notification.createNotification({
    recipient: user._id,
    type: 'system_alert',
    title: 'Welcome to the Financial Transparency Platform',
    message: `Welcome ${fullName}! Your ${role} account has been successfully created.`,
    priority: 'medium'
  });
  
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      level: user.level
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', rateLimit(15 * 60 * 1000, process.env.NODE_ENV === 'production' ? 10 : 100), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate email & password
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email and password'
    });
  }
  
  // Check for user
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  // Check if account is locked
  if (user.isLocked) {
    return res.status(423).json({
      success: false,
      message: 'Account is temporarily locked due to too many failed login attempts'
    });
  }
  
  // Check password
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    await user.incLoginAttempts();
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  // Reset login attempts on successful login
  await user.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
  
  const token = user.getSignedJwtToken();
  
  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      level: user.level,
      lastLoginAt: user.lastLoginAt
    }
  });
}));

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('badges');
  
  // Get unread notifications count
  const unreadNotifications = await Notification.getUnreadCount(user._id);
  
  res.status(200).json({
    success: true,
    user: {
      ...user.toObject(),
      unreadNotifications
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const allowedFields = [
    'fullName', 'department', 'companyName', 'walletAddress',
    'notifications.email', 'notifications.push', 'notifications.sms'
  ];
  
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');
  
  res.status(200).json({
    success: true,
    user
  });
}));

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current and new password'
    });
  }
  
  const user = await User.findById(req.user.id).select('+password');
  
  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }
  
  user.password = newPassword;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', rateLimit(15 * 60 * 1000, 3), asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No user found with that email'
    });
  }
  
  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  
  // Create reset url
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;
  
  // In a real application, you would send an email here
  console.log(`Password reset URL: ${resetUrl}`);
  
  res.status(200).json({
    success: true,
    message: 'Password reset token sent to email',
    resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
  });
}));

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  // Get hashed token
  const resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');
  
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });
  
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  
  const token = user.getSignedJwtToken();
  
  res.status(200).json({
    success: true,
    token,
    message: 'Password reset successful'
  });
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
}));

module.exports = router;