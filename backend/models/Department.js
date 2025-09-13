const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Department code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Department code cannot exceed 10 characters']
  },
  allocated: {
    type: Number,
    required: [true, 'Allocated budget is required'],
    min: [0, 'Allocated budget must be positive']
  },
  spent: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative']
  },
  fiscalYear: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ fiscalYear: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ manager: 1 });

// Compound indexes
departmentSchema.index({ fiscalYear: 1, isActive: 1 });

// Virtual for remaining budget
departmentSchema.virtual('remaining').get(function() {
  return this.allocated - this.spent;
});

// Virtual for utilization percentage
departmentSchema.virtual('utilization').get(function() {
  if (this.allocated === 0) return 0;
  return Math.round((this.spent / this.allocated) * 100 * 100) / 100; // Round to 2 decimal places
});

// Virtual for budget status
departmentSchema.virtual('status').get(function() {
  const utilization = this.utilization;
  if (utilization > 100) return 'over_budget';
  if (utilization > 90) return 'near_limit';
  if (utilization > 75) return 'high_usage';
  return 'normal';
});

// Static method to find active departments
departmentSchema.statics.findActive = function(fiscalYear = new Date().getFullYear()) {
  return this.find({ isActive: true, fiscalYear })
    .populate('manager', 'fullName email')
    .sort({ name: 1 });
};

// Static method to get budget summary
departmentSchema.statics.getBudgetSummary = function(fiscalYear = new Date().getFullYear()) {
  return this.aggregate([
    {
      $match: { fiscalYear, isActive: true }
    },
    {
      $group: {
        _id: null,
        totalAllocated: { $sum: '$allocated' },
        totalSpent: { $sum: '$spent' },
        departmentCount: { $sum: 1 },
        avgUtilization: { $avg: { $divide: ['$spent', '$allocated'] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalAllocated: 1,
        totalSpent: 1,
        totalRemaining: { $subtract: ['$totalAllocated', '$totalSpent'] },
        departmentCount: 1,
        avgUtilization: { $multiply: ['$avgUtilization', 100] },
        overallUtilization: { 
          $multiply: [{ $divide: ['$totalSpent', '$totalAllocated'] }, 100] 
        }
      }
    }
  ]);
};

// Static method to find over-budget departments
departmentSchema.statics.findOverBudget = function(fiscalYear = new Date().getFullYear()) {
  return this.find({
    fiscalYear,
    isActive: true,
    $expr: { $gt: ['$spent', '$allocated'] }
  }).populate('manager', 'fullName email');
};

// Instance method to update spent amount
departmentSchema.methods.updateSpent = async function(amount, operation = 'add') {
  if (operation === 'add') {
    this.spent += amount;
  } else if (operation === 'subtract') {
    this.spent = Math.max(0, this.spent - amount);
  } else {
    this.spent = amount;
  }
  
  return this.save();
};

// Instance method to check if over budget
departmentSchema.methods.isOverBudget = function() {
  return this.spent > this.allocated;
};

// Pre-save middleware to ensure spent doesn't exceed unreasonable limits
departmentSchema.pre('save', function(next) {
  // Warn if spending exceeds 150% of allocated budget
  if (this.spent > this.allocated * 1.5) {
    console.warn(`⚠️ Department ${this.name} spending (${this.spent}) exceeds 150% of allocated budget (${this.allocated})`);
  }
  
  next();
});

module.exports = mongoose.model('Department', departmentSchema);