const mongoose = require('mongoose');

// Vendor Wallet Model for digital wallet interface
const vendorWalletSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Wallet balances
  balances: {
    allocated: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      default: 0,
      min: 0
    },
    pending: {
      type: Number,
      default: 0,
      min: 0
    },
    withdrawn: {
      type: Number,
      default: 0,
      min: 0
    },
    frozen: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Currency breakdown
  currencyBalances: [{
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'ETH', 'MATIC'],
      default: 'USD'
    },
    amount: {
      type: Number,
      default: 0
    },
    exchangeRate: Number,
    lastUpdated: Date
  }],
  
  // Transaction history
  transactions: [{
    transactionId: String,
    type: {
      type: String,
      enum: ['allocation', 'release', 'withdrawal', 'freeze', 'unfreeze', 'reallocation'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    fromAddress: String,
    toAddress: String,
    description: String,
    relatedAllocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundAllocation'
    },
    blockchain: {
      transactionHash: String,
      blockNumber: Number,
      gasUsed: String,
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending'
      },
      confirmations: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Automatic withdrawal settings
  autoWithdrawal: {
    enabled: {
      type: Boolean,
      default: false
    },
    threshold: {
      type: Number,
      default: 0
    },
    destinationAddress: String,
    schedule: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'immediate'
    }
  },
  
  // Security settings
  security: {
    multiSigRequired: {
      type: Boolean,
      default: false
    },
    requiredSignatures: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    authorizedSigners: [{
      address: String,
      publicKey: String,
      name: String,
      role: String,
      addedAt: Date
    }],
    dailyWithdrawalLimit: {
      type: Number,
      default: 50000
    },
    monthlyWithdrawalLimit: {
      type: Number,
      default: 500000
    }
  },
  
  // Document storage for fund release
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'delivery_proof', 'milestone_report', 'compliance_doc', 'other']
    },
    filename: String,
    originalName: String,
    path: String,
    hash: String, // File hash for integrity
    size: Number,
    mimetype: String,
    relatedAllocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundAllocation'
    },
    status: {
      type: String,
      enum: ['uploaded', 'under_review', 'approved', 'rejected'],
      default: 'uploaded'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewComments: String
  }],
  
  // Performance metrics
  metrics: {
    totalReceived: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    averageReleaseTime: {
      type: Number,
      default: 0 // in hours
    },
    documentsUploadedCount: {
      type: Number,
      default: 0
    },
    complianceRate: {
      type: Number,
      default: 100 // percentage
    },
    lastActivityAt: Date
  },
  
  // Notification preferences
  notifications: {
    fundReceived: {
      type: Boolean,
      default: true
    },
    fundReleased: {
      type: Boolean,
      default: true
    },
    documentRequired: {
      type: Boolean,
      default: true
    },
    lowBalance: {
      type: Boolean,
      default: true
    },
    complianceAlert: {
      type: Boolean,
      default: true
    }
  },
  
  // Integration settings
  integrations: {
    bankAccount: {
      connected: Boolean,
      accountNumber: String,
      routingNumber: String,
      bankName: String,
      verifiedAt: Date
    },
    paymentProcessor: {
      provider: String, // stripe, paypal, etc.
      accountId: String,
      connected: Boolean,
      verifiedAt: Date
    }
  },
  
  // Wallet status
  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended', 'closed'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorWalletSchema.index({ vendor: 1 });
vendorWalletSchema.index({ walletAddress: 1 });
vendorWalletSchema.index({ status: 1 });
vendorWalletSchema.index({ 'transactions.createdAt': -1 });
vendorWalletSchema.index({ 'transactions.type': 1 });

// Virtual for total balance
vendorWalletSchema.virtual('totalBalance').get(function() {
  return this.balances.allocated + this.balances.available + this.balances.pending;
});

// Virtual for available for withdrawal
vendorWalletSchema.virtual('availableForWithdrawal').get(function() {
  return this.balances.available;
});

// Virtual for pending documents count
vendorWalletSchema.virtual('pendingDocumentsCount').get(function() {
  return this.documents.filter(doc => doc.status === 'uploaded' || doc.status === 'under_review').length;
});

// Instance method to add transaction
vendorWalletSchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);
  
  // Update balances based on transaction type
  const { type, amount } = transactionData;
  
  switch (type) {
    case 'allocation':
      this.balances.allocated += amount;
      break;
    case 'release':
      this.balances.allocated -= amount;
      this.balances.available += amount;
      break;
    case 'withdrawal':
      this.balances.available -= amount;
      this.balances.withdrawn += amount;
      break;
    case 'freeze':
      this.balances.available -= amount;
      this.balances.frozen += amount;
      break;
    case 'unfreeze':
      this.balances.frozen -= amount;
      this.balances.available += amount;
      break;
  }
  
  this.metrics.lastActivityAt = new Date();
  return this.save();
};

// Instance method to upload document
vendorWalletSchema.methods.uploadDocument = function(documentData) {
  this.documents.push(documentData);
  this.metrics.documentsUploadedCount += 1;
  return this.save();
};

// Instance method to withdraw funds
vendorWalletSchema.methods.withdrawFunds = function(amount, destinationAddress) {
  if (amount > this.balances.available) {
    throw new Error('Insufficient available balance');
  }
  
  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayWithdrawals = this.transactions.filter(tx => 
    tx.type === 'withdrawal' && 
    tx.createdAt >= today
  ).reduce((sum, tx) => sum + tx.amount, 0);
  
  if (todayWithdrawals + amount > this.security.dailyWithdrawalLimit) {
    throw new Error('Daily withdrawal limit exceeded');
  }
  
  return this.addTransaction({
    type: 'withdrawal',
    amount: amount,
    toAddress: destinationAddress,
    description: 'Vendor withdrawal'
  });
};

// Instance method to calculate compliance rate
vendorWalletSchema.methods.calculateComplianceRate = function() {
  const totalDocs = this.documents.length;
  if (totalDocs === 0) {
    this.metrics.complianceRate = 100;
    return this.save();
  }
  
  const approvedDocs = this.documents.filter(doc => doc.status === 'approved').length;
  this.metrics.complianceRate = (approvedDocs / totalDocs) * 100;
  
  return this.save();
};

// Static method to find by status
vendorWalletSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('vendor', 'fullName email companyName')
    .sort({ updatedAt: -1 });
};

// Static method to get wallet summary
vendorWalletSchema.statics.getWalletSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAllocated: { $sum: '$balances.allocated' },
        totalAvailable: { $sum: '$balances.available' },
        totalWithdrawn: { $sum: '$balances.withdrawn' }
      }
    }
  ]);
};

// Static method to find wallets with pending documents
vendorWalletSchema.statics.findWithPendingDocuments = function() {
  return this.find({
    'documents.status': { $in: ['uploaded', 'under_review'] }
  }).populate('vendor', 'fullName email companyName');
};

module.exports = mongoose.model('VendorWallet', vendorWalletSchema);