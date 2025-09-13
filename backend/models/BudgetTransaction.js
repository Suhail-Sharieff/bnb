const mongoose = require('mongoose');

const budgetTransactionSchema = new mongoose.Schema({
  // Blockchain specific fields
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  contractAddress: {
    type: String,
    required: true,
    trim: true
  },
  gasUsed: {
    type: String,
    required: true
  },
  networkName: {
    type: String,
    required: true,
    enum: ['sepolia', 'amoy', 'mumbai', 'mainnet', 'polygon'],
    default: 'sepolia'
  },
  
  // Budget data fields
  project: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  submittedBy: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Submitter name cannot exceed 100 characters']
  },
  submissionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'allocated', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Enhanced workflow fields
  budgetRequestId: {
    type: String,
    trim: true
  },
  allocationId: {
    type: String,
    trim: true
  },
  vendorAddress: {
    type: String,
    trim: true
  },
  complianceDocuments: [{
    filename: String,
    hash: String,
    uploadedAt: Date
  }],
  complianceMet: {
    type: Boolean,
    default: false
  },
  fundsReleased: {
    type: Boolean,
    default: false
  },
  releasedAmount: {
    type: Number,
    default: 0
  },
  allocatedAt: Date,
  releasedAt: Date,
  
  // Cryptographic fields
  dataHash: {
    type: String,
    required: true,
    trim: true
  },
  hashAlgorithm: {
    type: String,
    enum: ['keccak256', 'sha256'],
    default: 'keccak256'
  },
  
  // Verification fields
  verificationStatus: {
    type: String,
    enum: ['verified', 'tampered', 'pending'],
    default: 'verified'
  },
  lastVerifiedAt: {
    type: Date,
    default: Date.now
  },
  
  // User tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional metadata
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  vendor: {
    type: String,
    trim: true,
    maxlength: [100, 'Vendor name cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Anomaly detection
  anomalyScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  isAnomalous: {
    type: Boolean,
    default: false
  },
  anomalyReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
budgetTransactionSchema.index({ transactionHash: 1 });
budgetTransactionSchema.index({ blockNumber: -1 });
budgetTransactionSchema.index({ department: 1 });
budgetTransactionSchema.index({ approvalStatus: 1 });
budgetTransactionSchema.index({ verificationStatus: 1 });
budgetTransactionSchema.index({ createdBy: 1 });
budgetTransactionSchema.index({ createdAt: -1 });
budgetTransactionSchema.index({ amount: -1 });
budgetTransactionSchema.index({ submissionDate: -1 });

// Compound indexes
budgetTransactionSchema.index({ department: 1, approvalStatus: 1 });
budgetTransactionSchema.index({ networkName: 1, blockNumber: -1 });

// Virtual for explorer URL
budgetTransactionSchema.virtual('explorerUrl').get(function() {
  const baseUrls = {
    'sepolia': 'https://sepolia.etherscan.io/tx/',
    'amoy': 'https://amoy.polygonscan.com/tx/',
    'mumbai': 'https://mumbai.polygonscan.com/tx/',
    'polygon': 'https://polygonscan.com/tx/',
    'mainnet': 'https://etherscan.io/tx/'
  };
  
  return baseUrls[this.networkName] + this.transactionHash;
});

// Virtual for formatted amount
budgetTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Static method to find by department
budgetTransactionSchema.statics.findByDepartment = function(department) {
  return this.find({ department: new RegExp(department, 'i') })
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 });
};

// Static method to find pending transactions
budgetTransactionSchema.statics.findPending = function() {
  return this.find({ approvalStatus: 'pending' })
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 });
};

// Static method to find anomalous transactions
budgetTransactionSchema.statics.findAnomalous = function() {
  return this.find({ isAnomalous: true })
    .populate('createdBy', 'fullName email')
    .sort({ anomalyScore: -1, createdAt: -1 });
};

// Static method to get department spending summary
budgetTransactionSchema.statics.getDepartmentSummary = function() {
  return this.aggregate([
    {
      $match: { approvalStatus: { $in: ['approved', 'completed'] } }
    },
    {
      $group: {
        _id: '$department',
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        lastTransaction: { $max: '$createdAt' }
      }
    },
    {
      $sort: { totalSpent: -1 }
    }
  ]);
};

// Instance method to verify hash integrity
budgetTransactionSchema.methods.verifyIntegrity = function(currentHash) {
  const isVerified = this.dataHash === currentHash;
  this.verificationStatus = isVerified ? 'verified' : 'tampered';
  this.lastVerifiedAt = new Date();
  return this.save();
};

// Pre-save middleware for anomaly detection
budgetTransactionSchema.pre('save', function(next) {
  // Simple anomaly detection logic
  if (this.amount > 1000000) { // Amount over $1M
    this.anomalyScore = Math.min(this.anomalyScore + 0.3, 1);
    this.isAnomalous = this.anomalyScore > 0.7;
    if (this.isAnomalous && !this.anomalyReason) {
      this.anomalyReason = 'High amount transaction flagged for review';
    }
  }
  
  next();
});

module.exports = mongoose.model('BudgetTransaction', budgetTransactionSchema);