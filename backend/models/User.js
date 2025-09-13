const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'vendor', 'auditor'],
    required: true
  },
  walletAddress: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Vendor-specific fields
  companyName: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  taxId: {
    type: String,
    trim: true
  },
  businessLicense: {
    type: String,
    trim: true
  },
  
  // Performance metrics
  totalAllocated: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  reputationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  averageCompletionTime: {
    type: Number,
    default: 0 // in days
  },
  
  // Gamification fields
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    name: String,
    description: String,
    earnedAt: Date,
    iconUrl: String
  }],
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  // Notification preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  
  // Security fields
  lastLoginAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordChangedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // AI compatibility fields
  riskProfile: {
    score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    factors: [{
      name: String,
      weight: Number,
      value: Number
    }],
    lastUpdated: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ reputationScore: -1 });
userSchema.index({ isActive: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role, 
      email: this.email 
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Method to get reset password token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to update reputation score
userSchema.methods.updateReputation = function(change, reason = '') {
  const oldScore = this.reputationScore;
  this.reputationScore = Math.max(0, Math.min(100, this.reputationScore + change));
  
  // Update level based on reputation
  if (this.reputationScore >= 90) this.level = 'platinum';
  else if (this.reputationScore >= 70) this.level = 'gold';
  else if (this.reputationScore >= 50) this.level = 'silver';
  else this.level = 'bronze';
  
  return this.save();
};

// Method to award points and badges
userSchema.methods.awardPoints = function(points, badgeName = null, badgeDescription = null) {
  this.points += points;
  
  if (badgeName) {
    this.badges.push({
      name: badgeName,
      description: badgeDescription || badgeName,
      earnedAt: new Date(),
      iconUrl: `/assets/badges/${badgeName.toLowerCase().replace(/\s+/g, '-')}.png`
    });
  }
  
  return this.save();
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
    .select('-password')
    .sort({ reputationScore: -1 });
};

// Static method to get top performers
userSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({ role: 'vendor', isActive: true })
    .select('-password')
    .sort({ reputationScore: -1, completedProjects: -1 })
    .limit(limit);
};

module.exports = mongoose.model('User', userSchema);