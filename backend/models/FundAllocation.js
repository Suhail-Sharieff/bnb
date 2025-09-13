const mongoose = require('mongoose');

// Enhanced Fund Allocation Model for full-stack integration
const fundAllocationSchema = new mongoose.Schema({
  allocationId: {
    type: String,
    unique: true,
    required: true
  },
  budgetRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BudgetRequest',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Financial details
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  allocatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  releasedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Release schedule
  releaseSchedule: [{
    milestone: String,
    amount: Number,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'released', 'overdue'],
      default: 'pending'
    },
    releasedAt: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ['allocated', 'partially_released', 'fully_released', 'frozen', 'cancelled'],
    default: 'allocated'
  },
  
  // Document requirements
  requiredDocuments: [{
    name: String,
    description: String,
    isRequired: Boolean,
    submitted: Boolean,
    submittedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  }],
  
  // Compliance tracking
  complianceStatus: {
    type: String,
    enum: ['pending', 'compliant', 'non_compliant', 'under_review'],
    default: 'pending'
  },
  complianceChecks: [{
    checkType: String,
    status: String,
    completedAt: Date,
    details: String
  }],
  
  // Blockchain integration
  blockchain: {
    contractAddress: String,
    transactionHash: String,
    blockNumber: Number,
    gasUsed: String,
    network: {
      type: String,
      enum: ['sepolia', 'amoy', 'mumbai', 'polygon', 'mainnet'],
      default: 'sepolia'
    },
    isConfirmed: {
      type: Boolean,
      default: false
    },
    confirmations: {
      type: Number,
      default: 0
    }
  },
  
  // Automatic release conditions
  autoReleaseConditions: {
    enabled: {
      type: Boolean,
      default: false
    },
    conditions: [{
      type: {
        type: String,
        enum: ['document_upload', 'time_based', 'milestone_completion', 'admin_approval']
      },
      value: String,
      isMet: Boolean,
      metAt: Date
    }],
    allConditionsMet: {
      type: Boolean,
      default: false
    }
  },
  
  // Performance metrics
  metrics: {
    allocatedAt: Date,
    firstReleaseAt: Date,
    fullReleaseAt: Date,
    avgReleaseTime: Number, // in hours
    documentsSubmittedCount: Number,
    complianceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Communication and notes
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['general', 'compliance', 'release', 'admin'],
      default: 'general'
    }
  }],
  
  // Reallocation tracking
  reallocations: [{
    fromVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    toVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    reason: String,
    reallocatedAt: Date,
    reallocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    blockchainTxHash: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
fundAllocationSchema.index({ allocationId: 1 });
fundAllocationSchema.index({ budgetRequest: 1 });
fundAllocationSchema.index({ vendor: 1 });
fundAllocationSchema.index({ allocatedBy: 1 });
fundAllocationSchema.index({ status: 1 });
fundAllocationSchema.index({ complianceStatus: 1 });
fundAllocationSchema.index({ 'blockchain.isConfirmed': 1 });
fundAllocationSchema.index({ createdAt: -1 });

// Virtual for remaining amount
fundAllocationSchema.virtual('remainingAmount').get(function() {
  return this.allocatedAmount - this.releasedAmount;
});

// Virtual for release percentage
fundAllocationSchema.virtual('releasePercentage').get(function() {
  if (this.allocatedAmount === 0) return 0;
  return (this.releasedAmount / this.allocatedAmount) * 100;
});

// Virtual for blockchain explorer URL
fundAllocationSchema.virtual('explorerUrl').get(function() {
  if (!this.blockchain.transactionHash) return null;
  
  const baseUrls = {
    'sepolia': 'https://sepolia.etherscan.io/tx/',
    'amoy': 'https://amoy.polygonscan.com/tx/',
    'mumbai': 'https://mumbai.polygonscan.com/tx/',
    'polygon': 'https://polygonscan.com/tx/',
    'mainnet': 'https://etherscan.io/tx/'
  };
  
  return baseUrls[this.blockchain.network] + this.blockchain.transactionHash;
});

// Instance method to release funds
fundAllocationSchema.methods.releaseFunds = function(amount, releasedBy, milestoneId = null) {
  if (amount > this.remainingAmount) {
    throw new Error('Cannot release more than remaining amount');
  }
  
  this.releasedAmount += amount;
  this.pendingAmount = Math.max(0, this.pendingAmount - amount);
  
  // Update milestone if specified
  if (milestoneId) {
    const milestone = this.releaseSchedule.id(milestoneId);
    if (milestone) {
      milestone.status = 'released';
      milestone.releasedAt = new Date();
      milestone.releasedBy = releasedBy;
    }
  }
  
  // Update overall status
  if (this.releasedAmount >= this.allocatedAmount) {
    this.status = 'fully_released';
    this.metrics.fullReleaseAt = new Date();
  } else if (this.releasedAmount > 0) {
    this.status = 'partially_released';
    if (!this.metrics.firstReleaseAt) {
      this.metrics.firstReleaseAt = new Date();
    }
  }
  
  return this.save();
};

// Instance method to check auto-release conditions
fundAllocationSchema.methods.checkAutoReleaseConditions = function() {
  if (!this.autoReleaseConditions.enabled) return false;
  
  let allMet = true;
  
  for (let condition of this.autoReleaseConditions.conditions) {
    if (!condition.isMet) {
      allMet = false;
      break;
    }
  }
  
  this.autoReleaseConditions.allConditionsMet = allMet;
  return this.save().then(() => allMet);
};

// Instance method to add note
fundAllocationSchema.methods.addNote = function(authorId, content, type = 'general') {
  this.notes.push({
    author: authorId,
    content: content,
    type: type
  });
  return this.save();
};

// Static method to find by vendor
fundAllocationSchema.statics.findByVendor = function(vendorId, status = null) {
  const query = { vendor: vendorId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('budgetRequest', 'project amount category')
    .populate('allocatedBy', 'fullName email')
    .sort({ createdAt: -1 });
};

// Static method to get allocation summary
fundAllocationSchema.statics.getAllocationSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAllocated: { $sum: '$allocatedAmount' },
        totalReleased: { $sum: '$releasedAmount' },
        avgReleasePercentage: { $avg: { $multiply: [{ $divide: ['$releasedAmount', '$allocatedAmount'] }, 100] } }
      }
    }
  ]);
};

// Static method to find overdue releases
fundAllocationSchema.statics.findOverdueReleases = function() {
  const now = new Date();
  return this.find({
    'releaseSchedule.dueDate': { $lt: now },
    'releaseSchedule.status': 'pending'
  }).populate('vendor', 'fullName email companyName');
};

module.exports = mongoose.model('FundAllocation', fundAllocationSchema);