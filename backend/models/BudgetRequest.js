const mongoose = require('mongoose');

const budgetRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  project: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['equipment', 'software', 'services', 'infrastructure', 'research', 'marketing', 'operations', 'other'],
    default: 'other'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'ETH', 'MATIC']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  justification: {
    type: String,
    trim: true,
    maxlength: [2000, 'Justification cannot exceed 2000 characters']
  },
  
  // Budget state management
  state: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'allocated', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Timeline
  requestedDate: {
    type: Date,
    default: Date.now
  },
  requiredByDate: {
    type: Date,
    required: true
  },
  approvedAt: Date,
  allocatedAt: Date,
  completedAt: Date,
  
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Approval comments cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Document management
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  documentsHash: {
    type: String,
    trim: true
  },
  
  // Blockchain integration
  blockchainTxHash: {
    type: String,
    trim: true
  },
  contractAddress: {
    type: String,
    trim: true
  },
  blockNumber: Number,
  
  // Vendor assignment
  assignedVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vendorSelection: {
    criteria: String,
    selectedAt: Date,
    selectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Financial tracking
  allocatedAmount: {
    type: Number,
    default: 0
  },
  spentAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  
  // Compliance and risk
  riskAssessment: {
    score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    factors: [{
      name: String,
      impact: Number,
      description: String
    }],
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assessedAt: Date
  },
  complianceChecklist: [{
    item: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'not_required'],
      default: 'pending'
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // AI compatibility fields
  aiPredictions: {
    approvalProbability: {
      type: Number,
      min: 0,
      max: 1
    },
    estimatedCompletionTime: Number, // in days
    riskFactors: [String],
    recommendations: [String],
    lastUpdated: Date
  },
  
  // Workflow history
  stateHistory: [{
    state: String,
    timestamp: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: String
  }],
  
  // Communication logs
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Performance metrics
  metrics: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    avgProcessingTime: Number,
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
budgetRequestSchema.index({ requestId: 1 });
budgetRequestSchema.index({ requester: 1 });
budgetRequestSchema.index({ department: 1 });
budgetRequestSchema.index({ state: 1 });
budgetRequestSchema.index({ priority: 1 });
budgetRequestSchema.index({ category: 1 });
budgetRequestSchema.index({ assignedVendor: 1 });
budgetRequestSchema.index({ approvedBy: 1 });
budgetRequestSchema.index({ createdAt: -1 });
budgetRequestSchema.index({ requiredByDate: 1 });

// Compound indexes
budgetRequestSchema.index({ department: 1, state: 1 });
budgetRequestSchema.index({ state: 1, priority: 1 });
budgetRequestSchema.index({ requester: 1, state: 1 });

// Virtual for days until required
budgetRequestSchema.virtual('daysUntilRequired').get(function() {
  if (!this.requiredByDate) return null;
  const now = new Date();
  const required = new Date(this.requiredByDate);
  const diffTime = required - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for processing time
budgetRequestSchema.virtual('processingDays').get(function() {
  if (!this.approvedAt) return null;
  const requested = new Date(this.requestedDate);
  const approved = new Date(this.approvedAt);
  const diffTime = approved - requested;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for status color coding
budgetRequestSchema.virtual('statusColor').get(function() {
  const colors = {
    'pending': '#FFA500',
    'approved': '#28a745',
    'rejected': '#dc3545',
    'allocated': '#17a2b8',
    'completed': '#6f42c1',
    'cancelled': '#6c757d'
  };
  return colors[this.state] || '#000000';
});

// Pre-save middleware to update remaining amount
budgetRequestSchema.pre('save', function(next) {
  this.remainingAmount = this.allocatedAmount - this.spentAmount;
  next();
});

// Pre-save middleware to track state changes
budgetRequestSchema.pre('save', function(next) {
  if (this.isModified('state') && !this.isNew) {
    this.stateHistory.push({
      state: this.state,
      timestamp: new Date(),
      changedBy: this.modifiedBy || null, // This should be set by the controller
      comments: this.stateChangeComment || ''
    });
  }
  next();
});

// Instance method to change state
budgetRequestSchema.methods.changeState = function(newState, userId, comments) {
  this.state = newState;
  this.modifiedBy = userId;
  this.stateChangeComment = comments;
  
  // Set specific timestamps based on state
  if (newState === 'approved') {
    this.approvedAt = new Date();
    this.approvedBy = userId;
  } else if (newState === 'allocated') {
    this.allocatedAt = new Date();
  } else if (newState === 'completed') {
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Instance method to add comment
budgetRequestSchema.methods.addComment = function(authorId, content, isInternal = false) {
  this.comments.push({
    author: authorId,
    content: content,
    isInternal: isInternal
  });
  return this.save();
};

// Instance method to calculate risk score
budgetRequestSchema.methods.calculateRiskScore = function() {
  let score = 0.5; // Base score
  
  // Amount-based risk
  if (this.amount > 100000) score += 0.2;
  else if (this.amount > 50000) score += 0.1;
  
  // Timeline risk
  const daysUntilRequired = this.daysUntilRequired;
  if (daysUntilRequired < 7) score += 0.2;
  else if (daysUntilRequired < 30) score += 0.1;
  
  // Priority risk
  if (this.priority === 'urgent') score += 0.1;
  
  this.riskAssessment.score = Math.min(1, Math.max(0, score));
  return this.save();
};

// Static method to find by department
budgetRequestSchema.statics.findByDepartment = function(department, state) {
  const query = { department: new RegExp(department, 'i') };
  if (state) query.state = state;
  
  return this.find(query)
    .populate('requester', 'fullName email')
    .populate('approvedBy', 'fullName email')
    .populate('assignedVendor', 'fullName companyName')
    .sort({ createdAt: -1 });
};

// Static method to get dashboard statistics
budgetRequestSchema.statics.getDashboardStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$state',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get spending by category
budgetRequestSchema.statics.getSpendingByCategory = function() {
  return this.aggregate([
    {
      $match: { state: { $in: ['approved', 'allocated', 'completed'] } }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
        requestCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalSpent: -1 }
    }
  ]);
};

module.exports = mongoose.model('BudgetRequest', budgetRequestSchema);