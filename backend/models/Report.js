const mongoose = require('mongoose');

// Report Model for comprehensive reporting system
const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['budget_summary', 'vendor_performance', 'compliance_audit', 'blockchain_verification', 'financial_reconciliation', 'custom'],
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Report configuration
  parameters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    departments: [String],
    vendors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    categories: [String],
    includeBlockchainData: {
      type: Boolean,
      default: true
    },
    includeDocuments: {
      type: Boolean,
      default: false
    },
    groupBy: {
      type: String,
      enum: ['department', 'vendor', 'category', 'month', 'quarter', 'year'],
      default: 'department'
    }
  },
  
  // Report data
  data: {
    summary: {
      totalAllocations: Number,
      totalReleased: Number,
      totalPending: Number,
      totalVendors: Number,
      avgProcessingTime: Number
    },
    breakdowns: [{
      category: String,
      value: Number,
      percentage: Number,
      count: Number
    }],
    trends: [{
      period: String,
      allocated: Number,
      released: Number,
      pending: Number
    }],
    topVendors: [{
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      totalReceived: Number,
      complianceRate: Number,
      performanceScore: Number
    }],
    anomalies: [{
      type: String,
      description: String,
      amount: Number,
      riskLevel: String,
      relatedTransaction: String
    }]
  },
  
  // Blockchain verification
  blockchainVerification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationHash: String,
    transactionHash: String,
    blockNumber: Number,
    network: String,
    verifiedAt: Date,
    merkleRoot: String,
    proofOfAuthenticity: String
  },
  
  // File exports
  exports: [{
    format: {
      type: String,
      enum: ['pdf', 'csv', 'excel', 'json'],
      required: true
    },
    filename: String,
    path: String,
    size: Number,
    generatedAt: {
      type: Date,
      default: Date.now
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloaded: Date
  }],
  
  // Report status
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'expired'],
    default: 'generating'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Processing metadata
  processing: {
    startedAt: Date,
    completedAt: Date,
    processingTime: Number, // in milliseconds
    errors: [String],
    warnings: [String]
  },
  
  // Sharing and access
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permissions: {
        type: String,
        enum: ['view', 'download', 'share'],
        default: 'view'
      },
      sharedAt: Date
    }],
    publicUrl: String,
    expiresAt: Date
  },
  
  // Automation settings
  automation: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    schedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
      },
      dayOfWeek: Number, // 0-6, for weekly
      dayOfMonth: Number, // 1-31, for monthly
      time: String // HH:MM format
    },
    lastGenerated: Date,
    nextGeneration: Date,
    recipients: [{
      email: String,
      notifyOnGeneration: Boolean,
      includeAttachment: Boolean
    }]
  },
  
  // Quality metrics
  quality: {
    dataCompleteness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    timeliness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    relevance: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    generatedAt: Date,
    changes: String,
    archivedPath: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reportSchema.index({ reportId: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ type: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ 'parameters.dateRange.startDate': 1 });
reportSchema.index({ 'parameters.dateRange.endDate': 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'automation.nextGeneration': 1 });

// Virtual for report size
reportSchema.virtual('totalSize').get(function() {
  return this.exports.reduce((total, exp) => total + (exp.size || 0), 0);
});

// Virtual for download count
reportSchema.virtual('totalDownloads').get(function() {
  return this.exports.reduce((total, exp) => total + (exp.downloadCount || 0), 0);
});

// Virtual for blockchain verification status
reportSchema.virtual('isBlockchainVerified').get(function() {
  return this.blockchainVerification.isVerified && 
         this.blockchainVerification.transactionHash;
});

// Instance method to add export
reportSchema.methods.addExport = function(exportData) {
  this.exports.push(exportData);
  return this.save();
};

// Instance method to record download
reportSchema.methods.recordDownload = function(format) {
  const exportFile = this.exports.find(exp => exp.format === format);
  if (exportFile) {
    exportFile.downloadCount += 1;
    exportFile.lastDownloaded = new Date();
  }
  return this.save();
};

// Instance method to share report
reportSchema.methods.shareWith = function(userId, permissions = 'view') {
  const existingShare = this.sharing.sharedWith.find(share => 
    share.user.toString() === userId.toString()
  );
  
  if (existingShare) {
    existingShare.permissions = permissions;
  } else {
    this.sharing.sharedWith.push({
      user: userId,
      permissions: permissions,
      sharedAt: new Date()
    });
  }
  
  return this.save();
};

// Instance method to verify on blockchain
reportSchema.methods.verifyOnBlockchain = function(transactionHash, blockNumber, network) {
  this.blockchainVerification.isVerified = true;
  this.blockchainVerification.transactionHash = transactionHash;
  this.blockchainVerification.blockNumber = blockNumber;
  this.blockchainVerification.network = network;
  this.blockchainVerification.verifiedAt = new Date();
  
  // Generate verification hash
  const crypto = require('crypto');
  const reportData = JSON.stringify(this.data);
  this.blockchainVerification.verificationHash = crypto
    .createHash('sha256')
    .update(reportData)
    .digest('hex');
  
  return this.save();
};

// Instance method to update progress
reportSchema.methods.updateProgress = function(progress, status) {
  this.progress = progress;
  if (status) this.status = status;
  
  if (progress === 100 && status === 'completed') {
    this.processing.completedAt = new Date();
    if (this.processing.startedAt) {
      this.processing.processingTime = this.processing.completedAt - this.processing.startedAt;
    }
  }
  
  return this.save();
};

// Static method to find by type
reportSchema.statics.findByType = function(type, limit = 10) {
  return this.find({ type })
    .populate('generatedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find scheduled reports
reportSchema.statics.findScheduledReports = function() {
  const now = new Date();
  return this.find({
    'automation.isScheduled': true,
    'automation.nextGeneration': { $lte: now },
    status: { $ne: 'generating' }
  });
};

// Static method to get report statistics
reportSchema.statics.getReportStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processing.processingTime' },
        totalDownloads: { $sum: { $sum: '$exports.downloadCount' } },
        verifiedCount: {
          $sum: { $cond: ['$blockchainVerification.isVerified', 1, 0] }
        }
      }
    }
  ]);
};

// Static method to cleanup expired reports
reportSchema.statics.cleanupExpiredReports = function() {
  const now = new Date();
  return this.deleteMany({
    'sharing.expiresAt': { $lt: now },
    status: 'expired'
  });
};

module.exports = mongoose.model('Report', reportSchema);