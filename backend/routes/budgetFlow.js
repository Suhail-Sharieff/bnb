const express = require('express');
const BudgetFlow = require('../models/BudgetFlow');
const Department = require('../models/Department');
const BudgetRequest = require('../models/BudgetRequest');
const User = require('../models/User');
const { authenticate, isAdmin, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @desc    Create a new budget flow
// @route   POST /api/budget-flow
// @access  Private/Admin
router.post('/', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { budgetName, totalAmount, fiscalYear, description, departmentAllocations } = req.body;
  
  // Validate required fields
  if (!budgetName || !totalAmount || !fiscalYear) {
    return res.status(400).json({
      success: false,
      message: 'Budget name, total amount, and fiscal year are required'
    });
  }
  
  // Create budget flow
  const budgetFlowData = {
    budgetId: `BUDGET-${Date.now()}`,
    budgetName,
    totalAmount,
    fiscalYear,
    description,
    createdBy: req.user._id,
    departmentAllocations: departmentAllocations || []
  };
  
  const budgetFlow = await BudgetFlow.createBudgetFlow(budgetFlowData);
  
  res.status(201).json({
    success: true,
    data: budgetFlow,
    message: 'Budget flow created successfully'
  });
}));

// @desc    Get all budget flows
// @route   GET /api/budget-flow
// @access  Private/Admin
router.get('/', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.fiscalYear) filter.fiscalYear = req.query.fiscalYear;
  if (req.query.status) filter.status = req.query.status;
  
  const budgetFlows = await BudgetFlow.find(filter)
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await BudgetFlow.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    data: budgetFlows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get budget flow by ID
// @route   GET /api/budget-flow/:id
// @access  Private/Admin
router.get('/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const budgetFlow = await BudgetFlow.getBudgetFlowById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: budgetFlow
  });
}));

// @desc    Add department allocation to budget flow
// @route   POST /api/budget-flow/:id/departments
// @access  Private/Admin
router.post('/:id/departments', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { departmentId, departmentName, allocatedAmount } = req.body;
  
  // Validate required fields
  if (!departmentId || !departmentName || !allocatedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Department ID, name, and allocated amount are required'
    });
  }
  
  const budgetFlow = await BudgetFlow.findById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  const departmentData = {
    departmentId,
    departmentName,
    allocatedAmount
  };
  
  const updatedBudgetFlow = await budgetFlow.addDepartmentAllocation(departmentData);
  
  res.status(200).json({
    success: true,
    data: updatedBudgetFlow,
    message: 'Department allocation added successfully'
  });
}));

// @desc    Add project allocation to department
// @route   POST /api/budget-flow/:id/departments/:deptId/projects
// @access  Private/Admin
router.post('/:id/departments/:deptId/projects', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { projectId, projectName, allocatedAmount } = req.body;
  
  // Validate required fields
  if (!projectId || !projectName || !allocatedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Project ID, name, and allocated amount are required'
    });
  }
  
  const budgetFlow = await BudgetFlow.findById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  // Check if project exists
  const project = await BudgetRequest.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  const projectData = {
    projectId,
    projectName,
    allocatedAmount
  };
  
  try {
    const updatedBudgetFlow = await budgetFlow.addProjectAllocation(req.params.deptId, projectData);
    
    res.status(200).json({
      success: true,
      data: updatedBudgetFlow,
      message: 'Project allocation added successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @desc    Add vendor allocation to project
// @route   POST /api/budget-flow/:id/departments/:deptId/projects/:projId/vendors
// @access  Private/Admin
router.post('/:id/departments/:deptId/projects/:projId/vendors', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { vendorId, allocatedAmount, walletAddress } = req.body;
  
  // Validate required fields
  if (!vendorId || !allocatedAmount) {
    return res.status(400).json({
      success: false,
      message: 'Vendor ID and allocated amount are required'
    });
  }
  
  const budgetFlow = await BudgetFlow.findById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  // Check if vendor exists
  const vendor = await User.findById(vendorId);
  if (!vendor || vendor.role !== 'vendor') {
    return res.status(404).json({
      success: false,
      message: 'Valid vendor not found'
    });
  }
  
  const vendorData = {
    vendorId,
    vendorName: vendor.companyName || vendor.fullName,
    allocatedAmount,
    walletAddress: walletAddress || vendor.walletAddress
  };
  
  try {
    const updatedBudgetFlow = await budgetFlow.addVendorAllocation(req.params.deptId, req.params.projId, vendorData);
    
    res.status(200).json({
      success: true,
      data: updatedBudgetFlow,
      message: 'Vendor allocation added successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @desc    Update spent amounts
// @route   PUT /api/budget-flow/:id/spent
// @access  Private/Admin
router.put('/:id/spent', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { departmentId, projectId, vendorId, amount } = req.body;
  
  // Validate required fields
  if (!departmentId || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Department ID and amount are required'
    });
  }
  
  const budgetFlow = await BudgetFlow.findById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  try {
    const updatedBudgetFlow = await budgetFlow.updateSpentAmounts(departmentId, projectId, vendorId, amount);
    
    res.status(200).json({
      success: true,
      data: updatedBudgetFlow,
      message: 'Spent amounts updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// @desc    Get budget flow visualization data
// @route   GET /api/budget-flow/:id/visualization
// @access  Private/Admin
router.get('/:id/visualization', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const budgetFlow = await BudgetFlow.getBudgetFlowById(req.params.id);
  
  if (!budgetFlow) {
    return res.status(404).json({
      success: false,
      message: 'Budget flow not found'
    });
  }
  
  // Prepare data for visualization
  const visualizationData = {
    budget: {
      id: budgetFlow.budgetId,
      name: budgetFlow.budgetName,
      totalAmount: budgetFlow.totalAmount,
      spentAmount: budgetFlow.totalSpent,
      remainingAmount: budgetFlow.remainingAmount,
      utilization: budgetFlow.utilization
    },
    departments: budgetFlow.departmentAllocations.map(dept => ({
      id: dept.departmentId,
      name: dept.departmentName,
      allocatedAmount: dept.allocatedAmount,
      spentAmount: dept.spentAmount,
      remainingAmount: dept.allocatedAmount - dept.spentAmount,
      utilization: dept.allocatedAmount > 0 ? Math.round((dept.spentAmount / dept.allocatedAmount) * 100 * 100) / 100 : 0,
      projects: dept.projectAllocations.map(proj => ({
        id: proj.projectId,
        name: proj.projectName,
        allocatedAmount: proj.allocatedAmount,
        spentAmount: proj.spentAmount,
        remainingAmount: proj.allocatedAmount - proj.spentAmount,
        utilization: proj.allocatedAmount > 0 ? Math.round((proj.spentAmount / proj.allocatedAmount) * 100 * 100) / 100 : 0,
        vendors: proj.vendorAllocations.map(vendor => ({
          id: vendor.vendorId,
          name: vendor.vendorName,
          allocatedAmount: vendor.allocatedAmount,
          spentAmount: vendor.spentAmount,
          remainingAmount: vendor.allocatedAmount - vendor.spentAmount,
          utilization: vendor.allocatedAmount > 0 ? Math.round((vendor.spentAmount / vendor.allocatedAmount) * 100 * 100) / 100 : 0,
          walletAddress: vendor.walletAddress,
          transactionHash: vendor.transactionHash,
          status: vendor.status
        }))
      }))
    }))
  };
  
  res.status(200).json({
    success: true,
    data: visualizationData
  });
}));

module.exports = router;