const mongoose = require('mongoose');

const budgetFlowSchema = new mongoose.Schema({
  // Top-level budget information
  budgetId: {
    type: String,
    required: true,
    unique: true
  },
  budgetName: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  fiscalYear: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Department allocations
  departmentAllocations: [{
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    departmentName: {
      type: String,
      required: true
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    projectAllocations: [{
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BudgetRequest',
        required: true
      },
      projectName: {
        type: String,
        required: true
      },
      allocatedAmount: {
        type: Number,
        required: true,
        min: 0
      },
      spentAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      vendorAllocations: [{
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        vendorName: String,
        allocatedAmount: {
          type: Number,
          required: true,
          min: 0
        },
        spentAmount: {
          type: Number,
          default: 0,
          min: 0
        },
        walletAddress: String,
        transactionHash: String,
        status: {
          type: String,
          enum: ['allocated', 'in-progress', 'completed', 'cancelled'],
          default: 'allocated'
        }
      }]
    }]
  }],
  
  // Tracking information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
budgetFlowSchema.index({ budgetId: 1 });
budgetFlowSchema.index({ fiscalYear: 1 });
budgetFlowSchema.index({ createdBy: 1 });
budgetFlowSchema.index({ status: 1 });
budgetFlowSchema.index({ createdAt: -1 });

// Virtual for total spent amount
budgetFlowSchema.virtual('totalSpent').get(function() {
  return this.departmentAllocations.reduce((total, dept) => {
    return total + dept.spentAmount;
  }, 0);
});

// Virtual for remaining budget
budgetFlowSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.totalSpent;
});

// Virtual for utilization percentage
budgetFlowSchema.virtual('utilization').get(function() {
  if (this.totalAmount === 0) return 0;
  return Math.round((this.totalSpent / this.totalAmount) * 100 * 100) / 100;
});

// Static method to create a new budget flow
budgetFlowSchema.statics.createBudgetFlow = async function(budgetData) {
  const budgetFlow = new this(budgetData);
  return await budgetFlow.save();
};

// Static method to get budget flow by ID with full population
budgetFlowSchema.statics.getBudgetFlowById = function(budgetId) {
  return this.findOne({ budgetId })
    .populate('createdBy', 'fullName email')
    .populate('departmentAllocations.departmentId')
    .populate('departmentAllocations.projectAllocations.projectId')
    .populate('departmentAllocations.projectAllocations.vendorAllocations.vendorId');
};

// Static method to get budget flow for visualization
budgetFlowSchema.statics.getBudgetFlowForVisualization = async function(budgetFlowId) {
  const budgetFlow = await this.findById(budgetFlowId)
    .populate('createdBy', 'fullName email')
    .populate('departmentAllocations.departmentId')
    .populate('departmentAllocations.projectAllocations.projectId')
    .populate('departmentAllocations.projectAllocations.vendorAllocations.vendorId');
  
  if (!budgetFlow) {
    throw new Error('Budget flow not found');
  }
  
  // Calculate additional metrics for visualization
  const budgetData = {
    id: budgetFlow._id,
    name: budgetFlow.budgetName,
    totalAmount: budgetFlow.totalAmount,
    spentAmount: budgetFlow.totalSpent,
    remainingAmount: budgetFlow.remainingAmount,
    utilization: budgetFlow.utilization
  };
  
  const departments = budgetFlow.departmentAllocations.map(dept => ({
    id: dept._id,
    name: dept.departmentName,
    allocatedAmount: dept.allocatedAmount,
    spentAmount: dept.spentAmount,
    remainingAmount: dept.allocatedAmount - dept.spentAmount,
    utilization: dept.allocatedAmount > 0 ? (dept.spentAmount / dept.allocatedAmount) * 100 : 0,
    projects: dept.projectAllocations.map(proj => ({
      id: proj._id,
      name: proj.projectName,
      allocatedAmount: proj.allocatedAmount,
      spentAmount: proj.spentAmount,
      remainingAmount: proj.allocatedAmount - proj.spentAmount,
      utilization: proj.allocatedAmount > 0 ? (proj.spentAmount / proj.allocatedAmount) * 100 : 0,
      vendors: proj.vendorAllocations.map(vendor => ({
        id: vendor._id,
        name: vendor.vendorName,
        allocatedAmount: vendor.allocatedAmount,
        spentAmount: vendor.spentAmount,
        remainingAmount: vendor.allocatedAmount - vendor.spentAmount,
        utilization: vendor.allocatedAmount > 0 ? (vendor.spentAmount / vendor.allocatedAmount) * 100 : 0,
        walletAddress: vendor.walletAddress,
        transactionHash: vendor.transactionHash,
        status: vendor.status
      }))
    }))
  }));
  
  return {
    budget: budgetData,
    departments: departments
  };
};

// Instance method to add department allocation
budgetFlowSchema.methods.addDepartmentAllocation = async function(departmentData) {
  this.departmentAllocations.push(departmentData);
  this.updatedAt = Date.now();
  return await this.save();
};

// Instance method to add project allocation
budgetFlowSchema.methods.addProjectAllocation = async function(departmentId, projectData) {
  const department = this.departmentAllocations.id(departmentId);
  if (department) {
    department.projectAllocations.push(projectData);
    this.updatedAt = Date.now();
    return await this.save();
  }
  throw new Error('Department not found');
};

// Instance method to add vendor allocation
budgetFlowSchema.methods.addVendorAllocation = async function(departmentId, projectId, vendorData) {
  const department = this.departmentAllocations.id(departmentId);
  if (department) {
    const project = department.projectAllocations.id(projectId);
    if (project) {
      project.vendorAllocations.push(vendorData);
      this.updatedAt = Date.now();
      return await this.save();
    }
    throw new Error('Project not found');
  }
  throw new Error('Department not found');
};

// Instance method to update spent amounts
budgetFlowSchema.methods.updateSpentAmounts = async function(departmentId, projectId, vendorId, amount) {
  const department = this.departmentAllocations.id(departmentId);
  if (department) {
    department.spentAmount += amount;
    
    if (projectId) {
      const project = department.projectAllocations.id(projectId);
      if (project) {
        project.spentAmount += amount;
        
        if (vendorId) {
          const vendor = project.vendorAllocations.id(vendorId);
          if (vendor) {
            vendor.spentAmount += amount;
          }
        }
      }
    }
    
    this.updatedAt = Date.now();
    return await this.save();
  }
  throw new Error('Department not found');
};

module.exports = mongoose.model('BudgetFlow', budgetFlowSchema);