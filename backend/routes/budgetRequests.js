const express = require('express');
const BudgetRequest = require('../models/BudgetRequest');
const BudgetTransaction = require('../models/BudgetTransaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, authorize, asyncHandler, auditLog, checkResourcePermission } = require('../middleware/auth');

const router = express.Router();

// @desc    Create new budget request
// @route   POST /api/budget-requests
// @access  Private
router.post('/', authenticate, auditLog('create_budget_request'), asyncHandler(async (req, res) => {
  const {
    department, project, category, amount, currency, description, justification,
    requiredByDate, priority, tags
  } = req.body;
  
  // Validate required fields
  if (!department || !project || !amount || !description || !requiredByDate) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: department, project, amount, description, requiredByDate'
    });
  }
  
  // Generate unique request ID
  const requestId = `BR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const budgetRequest = await BudgetRequest.create({
    requestId,
    requester: req.user._id,
    department,
    project,
    category,
    amount,
    currency,
    description,
    justification,
    requiredByDate: new Date(requiredByDate),
    priority,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : []
  });
  
  // Calculate initial risk assessment
  await budgetRequest.calculateRiskScore();
  
  // Notify admins
  const admins = await User.find({ role: 'admin', isActive: true });
  for (const admin of admins) {
    await Notification.createNotification({
      recipient: admin._id,
      sender: req.user._id,
      type: 'budget_request_created',
      title: 'New Budget Request',
      message: `${req.user.fullName} has submitted a budget request for ${project} ($${amount.toLocaleString()})`,
      relatedEntity: {
        entityType: 'BudgetRequest',
        entityId: budgetRequest._id
      },
      priority: priority === 'urgent' ? 'high' : 'medium',
      actions: [{
        label: 'Review Request',
        type: 'link',
        url: `/admin/budget-requests/${budgetRequest._id}`
      }]
    });
  }
  
  const populatedRequest = await BudgetRequest.findById(budgetRequest._id)
    .populate('requester', 'fullName email department');
  
  res.status(201).json({
    success: true,
    data: populatedRequest,
    message: 'Budget request created successfully'
  });
}));

// @desc    Get user's budget requests
// @route   GET /api/budget-requests
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  let filter = {};
  
  // Users can only see their own requests unless they're admin
  if (req.user.role !== 'admin') {
    filter.requester = req.user._id;
  }
  
  // Apply additional filters
  if (req.query.state) filter.state = req.query.state;
  if (req.query.department) filter.department = new RegExp(req.query.department, 'i');
  if (req.query.category) filter.category = req.query.category;
  if (req.query.priority) filter.priority = req.query.priority;
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }
  
  const requests = await BudgetRequest.find(filter)
    .populate('requester', 'fullName email department')
    .populate('approvedBy', 'fullName email')
    .populate('assignedVendor', 'fullName companyName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await BudgetRequest.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    data: requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get single budget request
// @route   GET /api/budget-requests/:id
// @access  Private
router.get('/:id', 
  authenticate, 
  checkResourcePermission(BudgetRequest), 
  asyncHandler(async (req, res) => {
    const request = await BudgetRequest.findById(req.params.id)
      .populate('requester', 'fullName email department')
      .populate('approvedBy', 'fullName email')
      .populate('assignedVendor', 'fullName companyName email')
      .populate('comments.author', 'fullName email')
      .populate('vendorSelection.selectedBy', 'fullName email');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Budget request not found'
      });
    }
    
    // Get related transactions
    const transactions = await BudgetTransaction.find({
      budgetRequestId: request.requestId
    }).populate('createdBy', 'fullName email');
    
    // Increment view count
    request.metrics.viewCount += 1;
    request.metrics.lastViewed = new Date();
    await request.save();
    
    res.status(200).json({
      success: true,
      data: {
        request,
        transactions
      }
    });
  })
);

// @desc    Update budget request
// @route   PUT /api/budget-requests/:id
// @access  Private
router.put('/:id', 
  authenticate, 
  checkResourcePermission(BudgetRequest),
  auditLog('update_budget_request'),
  asyncHandler(async (req, res) => {
    let request = await BudgetRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Budget request not found'
      });
    }
    
    // Only allow updates if request is in pending state
    if (request.state !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be updated'
      });
    }
    
    // Only requester or admin can update
    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request'
      });
    }
    
    const allowedFields = [
      'department', 'project', 'category', 'amount', 'currency',
      'description', 'justification', 'requiredByDate', 'priority', 'tags'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });
    
    // Process tags if provided
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim());
    }
    
    request = await BudgetRequest.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('requester', 'fullName email department');
    
    // Recalculate risk score if amount changed
    if (updates.amount) {
      await request.calculateRiskScore();
    }
    
    res.status(200).json({
      success: true,
      data: request,
      message: 'Budget request updated successfully'
    });
  })
);

// @desc    Cancel budget request
// @route   DELETE /api/budget-requests/:id
// @access  Private
router.delete('/:id', 
  authenticate, 
  checkResourcePermission(BudgetRequest),
  auditLog('cancel_budget_request'),
  asyncHandler(async (req, res) => {
    const request = await BudgetRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Budget request not found'
      });
    }
    
    // Only allow cancellation if request is pending or approved
    if (!['pending', 'approved'].includes(request.state)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or approved requests can be cancelled'
      });
    }
    
    // Only requester or admin can cancel
    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }
    
    await request.changeState('cancelled', req.user._id, req.body.reason || 'Cancelled by user');
    
    // Notify relevant parties
    const notifyUsers = [];
    if (request.approvedBy) notifyUsers.push(request.approvedBy);
    if (request.assignedVendor) notifyUsers.push(request.assignedVendor);
    
    for (const userId of notifyUsers) {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user._id,
        type: 'system_alert',
        title: 'Budget Request Cancelled',
        message: `Budget request for ${request.project} has been cancelled`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: request._id
        },
        priority: 'medium'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Budget request cancelled successfully'
    });
  })
);

// @desc    Add comment to budget request
// @route   POST /api/budget-requests/:id/comments
// @access  Private
router.post('/:id/comments', 
  authenticate, 
  checkResourcePermission(BudgetRequest),
  asyncHandler(async (req, res) => {
    const { content, isInternal = false } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    const request = await BudgetRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Budget request not found'
      });
    }
    
    await request.addComment(req.user._id, content.trim(), isInternal);
    
    // Notify relevant users (except comment author)
    const notifyUsers = [request.requester];
    if (request.approvedBy) notifyUsers.push(request.approvedBy);
    if (request.assignedVendor) notifyUsers.push(request.assignedVendor);
    
    // Add admins if not internal comment
    if (!isInternal) {
      const admins = await User.find({ role: 'admin', isActive: true });
      notifyUsers.push(...admins);
    }
    
    // Remove duplicates and comment author
    const uniqueUsers = [...new Set(notifyUsers.map(u => u._id.toString()))]
      .filter(id => id !== req.user._id.toString());
    
    for (const userId of uniqueUsers) {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user._id,
        type: 'system_alert',
        title: 'New Comment on Budget Request',
        message: `${req.user.fullName} added a comment to budget request: ${request.project}`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: request._id
        },
        priority: 'low'
      });
    }
    
    const updatedRequest = await BudgetRequest.findById(req.params.id)
      .populate('comments.author', 'fullName email');
    
    res.status(200).json({
      success: true,
      data: updatedRequest,
      message: 'Comment added successfully'
    });
  })
);

// @desc    Get budget request analytics
// @route   GET /api/budget-requests/analytics/dashboard
// @access  Private
router.get('/analytics/dashboard', authenticate, asyncHandler(async (req, res) => {
  let filter = {};
  
  // Non-admin users can only see their own analytics
  if (req.user.role !== 'admin') {
    filter.requester = req.user._id;
  }
  
  // Apply department filter for department heads
  if (req.user.role === 'vendor') {
    filter.assignedVendor = req.user._id;
  }
  
  // Get basic statistics
  const totalRequests = await BudgetRequest.countDocuments(filter);
  const pendingRequests = await BudgetRequest.countDocuments({ ...filter, state: 'pending' });
  const approvedRequests = await BudgetRequest.countDocuments({ ...filter, state: 'approved' });
  const completedRequests = await BudgetRequest.countDocuments({ ...filter, state: 'completed' });
  
  // Get total amounts
  const amountStats = await BudgetRequest.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$state',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get category breakdown
  const categoryStats = await BudgetRequest.aggregate([
    { $match: { ...filter, state: { $in: ['approved', 'allocated', 'completed'] } } },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
  
  // Get monthly trend
  const monthlyTrend = await BudgetRequest.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        requests: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        completedRequests
      },
      amountStats,
      categoryStats,
      monthlyTrend
    }
  });
}));

// @desc    Duplicate budget request
// @route   POST /api/budget-requests/:id/duplicate
// @access  Private
router.post('/:id/duplicate', 
  authenticate, 
  checkResourcePermission(BudgetRequest),
  asyncHandler(async (req, res) => {
    const originalRequest = await BudgetRequest.findById(req.params.id);
    
    if (!originalRequest) {
      return res.status(404).json({
        success: false,
        message: 'Budget request not found'
      });
    }
    
    // Create new request based on original
    const requestId = `BR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const duplicatedRequest = await BudgetRequest.create({
      requestId,
      requester: req.user._id,
      department: originalRequest.department,
      project: `${originalRequest.project} (Copy)`,
      category: originalRequest.category,
      amount: originalRequest.amount,
      currency: originalRequest.currency,
      description: originalRequest.description,
      justification: originalRequest.justification,
      requiredByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      priority: originalRequest.priority,
      tags: [...originalRequest.tags]
    });
    
    const populatedRequest = await BudgetRequest.findById(duplicatedRequest._id)
      .populate('requester', 'fullName email department');
    
    res.status(201).json({
      success: true,
      data: populatedRequest,
      message: 'Budget request duplicated successfully'
    });
  })
);

module.exports = router;