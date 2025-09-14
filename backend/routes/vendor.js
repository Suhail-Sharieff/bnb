const express = require('express');
const multer = require('multer');
const path = require('path');
const BudgetRequest = require('../models/BudgetRequest');
const BudgetTransaction = require('../models/BudgetTransaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, authorize, isVendor, asyncHandler, auditLog, validateFileUpload } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/compliance/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and TXT files are allowed.'));
    }
  }
});

// @desc    Get vendor dashboard
// @route   GET /api/vendor/dashboard
// @access  Private/Vendor
router.get('/dashboard', authenticate, isVendor, asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  
  // Get vendor's allocated projects
  const allocatedProjects = await BudgetRequest.find({
    assignedVendor: vendorId
  }).populate('requester', 'fullName email department');
  
  // Get financial summary
  const financialSummary = {
    totalAllocated: req.user.totalAllocated || 0,
    totalWithdrawn: req.user.totalWithdrawn || 0,
    pendingAmount: 0,
    availableAmount: 0
  };
  
  // Calculate pending and available amounts
  const activeAllocations = allocatedProjects.filter(project => 
    ['allocated'].includes(project.state)
  );
  
  financialSummary.pendingAmount = activeAllocations.reduce((sum, project) => 
    sum + (project.allocatedAmount || project.amount), 0
  );
  
  financialSummary.availableAmount = financialSummary.totalAllocated - financialSummary.totalWithdrawn;
  
  // Get project statistics
  const projectStats = {
    total: allocatedProjects.length,
    active: allocatedProjects.filter(p => p.state === 'allocated').length,
    completed: allocatedProjects.filter(p => p.state === 'completed').length,
    pending: allocatedProjects.filter(p => p.state === 'pending').length
  };
  
  // Get recent transactions
  const recentTransactions = await BudgetTransaction.find({
    vendorAddress: req.user.walletAddress
  }).sort({ createdAt: -1 }).limit(10);
  
  // Get compliance status
  const complianceStatus = {
    documentsRequired: 0,
    documentsSubmitted: 0,
    verified: 0,
    pending: 0
  };
  
  allocatedProjects.forEach(project => {
    if (project.state === 'allocated') {
      complianceStatus.documentsRequired++;
      if (project.complianceChecklist && project.complianceChecklist.length > 0) {
        complianceStatus.documentsSubmitted++;
        const verified = project.complianceChecklist.every(item => item.status === 'completed');
        if (verified) {
          complianceStatus.verified++;
        } else {
          complianceStatus.pending++;
        }
      }
    }
  });
  
  res.status(200).json({
    success: true,
    data: {
      profile: {
        fullName: req.user.fullName,
        companyName: req.user.companyName,
        reputationScore: req.user.reputationScore,
        level: req.user.level,
        points: req.user.points,
        badges: req.user.badges
      },
      financialSummary,
      projectStats,
      complianceStatus,
      recentProjects: allocatedProjects.slice(0, 5),
      recentTransactions
    }
  });
}));

// @desc    Get vendor's allocated projects
// @route   GET /api/vendor/projects
// @access  Private/Vendor
router.get('/projects', authenticate, isVendor, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = { assignedVendor: req.user._id };
  
  if (req.query.state) filter.state = req.query.state;
  if (req.query.category) filter.category = req.query.category;
  
  const projects = await BudgetRequest.find(filter)
    .populate('requester', 'fullName email department')
    .populate('approvedBy', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await BudgetRequest.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    data: projects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get project details
// @route   GET /api/vendor/projects/:id
// @access  Private/Vendor
router.get('/projects/:id', authenticate, isVendor, asyncHandler(async (req, res) => {
  const project = await BudgetRequest.findOne({
    _id: req.params.id,
    assignedVendor: req.user._id
  })
    .populate('requester', 'fullName email department')
    .populate('approvedBy', 'fullName email')
    .populate('comments.author', 'fullName email');
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or not assigned to you'
    });
  }
  
  // Get related transactions
  const transactions = await BudgetTransaction.find({
    budgetRequestId: project.requestId
  }).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    data: {
      project,
      transactions
    }
  });
}));

// @desc    Upload compliance documents
// @route   POST /api/vendor/projects/:id/documents
// @access  Private/Vendor
router.post('/projects/:id/documents', 
  authenticate, 
  isVendor, 
  upload.array('documents', 5),
  auditLog('upload_compliance_documents'),
  asyncHandler(async (req, res) => {
    const project = await BudgetRequest.findOne({
      _id: req.params.id,
      assignedVendor: req.user._id
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not assigned to you'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    // Process uploaded files
    const uploadedDocs = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    }));
    
    // Add documents to project
    project.attachments.push(...uploadedDocs);
    
    // Update compliance checklist
    if (!project.complianceChecklist) {
      project.complianceChecklist = [];
    }
    
    // Add new compliance items for uploaded documents
    uploadedDocs.forEach(doc => {
      project.complianceChecklist.push({
        item: `Document: ${doc.originalName}`,
        status: 'pending',
        completedAt: new Date(),
        completedBy: req.user._id,
        notes: 'Document submitted for review'
      });
    });
    
    await project.save();
    
    // Create notification for admin
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        sender: req.user._id,
        type: 'document_uploaded',
        title: 'Compliance Documents Uploaded',
        message: `${req.user.fullName} has uploaded ${uploadedDocs.length} document(s) for project: ${project.project}`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: project._id
        },
        priority: 'medium'
      });
    }
    
    // Award points for document submission
    await req.user.awardPoints(10, 'Document Submitter', 'Submitted compliance documents on time');
    
    res.status(200).json({
      success: true,
      data: {
        project,
        uploadedDocuments: uploadedDocs
      },
      message: 'Documents uploaded successfully'
    });
  })
);

// @desc    Add project comment
// @route   POST /api/vendor/projects/:id/comments
// @access  Private/Vendor
router.post('/projects/:id/comments', authenticate, isVendor, asyncHandler(async (req, res) => {
  const { content, isInternal = false } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  const project = await BudgetRequest.findOne({
    _id: req.params.id,
    assignedVendor: req.user._id
  });
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or not assigned to you'
    });
  }
  
  await project.addComment(req.user._id, content.trim(), isInternal);
  
  // Notify requester and admins
  const notifyUsers = [project.requester];
  if (!isInternal) {
    const admins = await User.find({ role: 'admin', isActive: true });
    notifyUsers.push(...admins);
  }
  
  for (const user of notifyUsers) {
    if (user._id.toString() !== req.user._id.toString()) {
      await Notification.createNotification({
        recipient: user._id,
        sender: req.user._id,
        type: 'system_alert',
        title: 'New Project Comment',
        message: `${req.user.fullName} added a comment to project: ${project.project}`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: project._id
        },
        priority: 'low'
      });
    }
  }
  
  const updatedProject = await BudgetRequest.findById(req.params.id)
    .populate('comments.author', 'fullName email');
  
  res.status(200).json({
    success: true,
    data: updatedProject,
    message: 'Comment added successfully'
  });
}));

// @desc    Request fund release
// @route   POST /api/vendor/projects/:id/request-release
// @access  Private/Vendor
router.post('/projects/:id/request-release', 
  authenticate, 
  isVendor, 
  auditLog('request_fund_release'),
  asyncHandler(async (req, res) => {
    const { amount, justification } = req.body;
    
    const project = await BudgetRequest.findOne({
      _id: req.params.id,
      assignedVendor: req.user._id
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not assigned to you'
      });
    }
    
    if (project.state !== 'allocated') {
      return res.status(400).json({
        success: false,
        message: 'Funds can only be requested for allocated projects'
      });
    }
    
    const requestAmount = amount || project.allocatedAmount || project.amount;
    
    // Check if sufficient documents are uploaded
    if (!project.attachments || project.attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload compliance documents before requesting fund release'
      });
    }
    
    // Add comment about fund release request
    await project.addComment(
      req.user._id, 
      `Fund release requested: $${requestAmount.toLocaleString()}. ${justification || 'Standard release request.'}`,
      false
    );
    
    // Notify admins
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        sender: req.user._id,
        type: 'compliance_required',
        title: 'Fund Release Requested',
        message: `${req.user.fullName} has requested fund release of $${requestAmount.toLocaleString()} for project: ${project.project}`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: project._id
        },
        priority: 'high',
        actions: [{
          label: 'Review Project',
          type: 'link',
          url: `/admin/projects/${project._id}`
        }]
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Fund release request submitted successfully'
    });
  })
);

// @desc    Get vendor wallet information
// @route   GET /api/vendor/wallet
// @access  Private/Vendor
router.get('/wallet', authenticate, isVendor, asyncHandler(async (req, res) => {
  const vendor = req.user;
  
  // Get transaction history
  const transactions = await BudgetTransaction.find({
    $or: [
      { vendorAddress: vendor.walletAddress },
      { createdBy: vendor._id }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(50);
  
  // Calculate wallet balance
  const balance = {
    allocated: vendor.totalAllocated || 0,
    withdrawn: vendor.totalWithdrawn || 0,
    available: (vendor.totalAllocated || 0) - (vendor.totalWithdrawn || 0),
    pending: 0
  };
  
  // Calculate pending amounts from active projects
  const activeProjects = await BudgetRequest.find({
    assignedVendor: vendor._id,
    state: 'allocated'
  });
  
  balance.pending = activeProjects.reduce((sum, project) => 
    sum + (project.allocatedAmount || project.amount), 0
  );
  
  // Get recent activity
  const recentActivity = transactions.slice(0, 10).map(tx => ({
    id: tx._id,
    type: tx.approvalStatus,
    amount: tx.amount,
    project: tx.project,
    date: tx.createdAt,
    status: tx.verificationStatus,
    transactionHash: tx.transactionHash,
    explorerUrl: tx.explorerUrl
  }));
  
  res.status(200).json({
    success: true,
    data: {
      walletAddress: vendor.walletAddress,
      balance,
      recentActivity,
      totalTransactions: transactions.length
    }
  });
}));

// @desc    Get vendor transactions
// @route   GET /api/vendor/transactions
// @access  Private/Vendor
router.get('/transactions', authenticate, isVendor, asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter transactions for this vendor
    const filter = {
      $or: [
        { vendorAddress: req.user.walletAddress },
        { createdBy: req.user._id }
      ]
    };
    
    if (req.query.status) filter.verificationStatus = req.query.status;
    if (req.query.project) filter.project = new RegExp(req.query.project, 'i');
    
    const transactions = await BudgetTransaction.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await BudgetTransaction.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vendor transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
}));

// @desc    Update vendor profile
// @route   PUT /api/vendor/profile
// @access  Private/Vendor
router.put('/profile', authenticate, isVendor, asyncHandler(async (req, res) => {
  const allowedFields = [
    'fullName', 'companyName', 'taxId', 'businessLicense', 'walletAddress',
    'notifications.email', 'notifications.push', 'notifications.sms'
  ];
  
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });
  
  const vendor = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');
  
  res.status(200).json({
    success: true,
    data: vendor,
    message: 'Profile updated successfully'
  });
}));

// @desc    Get vendor performance metrics
// @route   GET /api/vendor/performance
// @access  Private/Vendor
router.get('/performance', authenticate, isVendor, asyncHandler(async (req, res) => {
  const vendor = req.user;
  
  // Get project completion statistics
  const completedProjects = await BudgetRequest.find({
    assignedVendor: vendor._id,
    state: 'completed'
  });
  
  const totalProjects = await BudgetRequest.countDocuments({
    assignedVendor: vendor._id
  });
  
  // Calculate average completion time
  const completionTimes = completedProjects
    .filter(p => p.allocatedAt && p.completedAt)
    .map(p => {
      const allocated = new Date(p.allocatedAt);
      const completed = new Date(p.completedAt);
      return Math.ceil((completed - allocated) / (1000 * 60 * 60 * 24)); // days
    });
  
  const avgCompletionTime = completionTimes.length > 0 
    ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
    : 0;
  
  // Performance metrics
  const metrics = {
    totalProjects,
    completedProjects: completedProjects.length,
    completionRate: totalProjects > 0 ? (completedProjects.length / totalProjects * 100).toFixed(1) : 0,
    avgCompletionTime: Math.round(avgCompletionTime),
    reputationScore: vendor.reputationScore,
    totalEarned: vendor.totalWithdrawn || 0,
    currentLevel: vendor.level,
    totalPoints: vendor.points || 0,
    badges: vendor.badges || []
  };
  
  // Get monthly performance data for charts
  const monthlyData = await BudgetRequest.aggregate([
    {
      $match: {
        assignedVendor: vendor._id,
        completedAt: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$completedAt' },
          month: { $month: '$completedAt' }
        },
        projectsCompleted: { $sum: 1 },
        totalEarned: { $sum: '$allocatedAmount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      metrics,
      monthlyPerformance: monthlyData,
      badges: vendor.badges,
      nextLevelRequirements: getNextLevelRequirements(vendor.level, vendor.reputationScore)
    }
  });
}));

// Helper function to get next level requirements
function getNextLevelRequirements(currentLevel, currentScore) {
  const levels = {
    bronze: { next: 'silver', scoreRequired: 50 },
    silver: { next: 'gold', scoreRequired: 70 },
    gold: { next: 'platinum', scoreRequired: 90 },
    platinum: { next: null, scoreRequired: null }
  };
  
  const current = levels[currentLevel];
  if (!current || !current.next) {
    return { message: 'Maximum level achieved!' };
  }
  
  return {
    nextLevel: current.next,
    scoreRequired: current.scoreRequired,
    scoreNeeded: Math.max(0, current.scoreRequired - currentScore),
    progress: Math.min(100, (currentScore / current.scoreRequired) * 100).toFixed(1)
  };
}

module.exports = router;