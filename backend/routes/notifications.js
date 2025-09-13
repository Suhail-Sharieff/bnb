const express = require('express');
const Notification = require('../models/Notification');
const { authenticate, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const filter = { recipient: req.user._id };
  
  // Filter by status if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Filter by type if provided
  if (req.query.type) {
    filter.type = req.query.type;
  }
  
  // Filter by priority if provided
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  
  const notifications = await Notification.find(filter)
    .populate('sender', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.getUnreadCount(req.user._id);
  
  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  });
}));

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  }).populate('sender', 'fullName email');
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: notification
  });
}));

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }
  
  await notification.markAsRead();
  
  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as read'
  });
}));

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await Notification.markAllAsRead(req.user._id);
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// @desc    Dismiss notification
// @route   PUT /api/notifications/:id/dismiss
// @access  Private
router.put('/:id/dismiss', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }
  
  await notification.dismiss();
  
  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification dismissed'
  });
}));

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }
  
  await Notification.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
router.get('/stats/overview', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const stats = await Notification.aggregate([
    { $match: { recipient: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const typeStats = await Notification.aggregate([
    { $match: { recipient: userId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  const priorityStats = await Notification.aggregate([
    { $match: { recipient: userId } },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalNotifications = await Notification.countDocuments({ recipient: userId });
  const unreadCount = await Notification.getUnreadCount(userId);
  
  res.status(200).json({
    success: true,
    data: {
      total: totalNotifications,
      unread: unreadCount,
      statusBreakdown: stats,
      typeBreakdown: typeStats,
      priorityBreakdown: priorityStats
    }
  });
}));

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
router.put('/preferences', authenticate, asyncHandler(async (req, res) => {
  const { email, push, sms } = req.body;
  
  const updatedUser = await req.user.constructor.findByIdAndUpdate(
    req.user._id,
    {
      'notifications.email': email,
      'notifications.push': push,
      'notifications.sms': sms
    },
    { new: true }
  ).select('notifications');
  
  res.status(200).json({
    success: true,
    data: updatedUser.notifications,
    message: 'Notification preferences updated successfully'
  });
}));

// @desc    Create notification (Internal use)
// @route   POST /api/notifications
// @access  Private/Admin
router.post('/', authenticate, asyncHandler(async (req, res) => {
  // Only allow admins to create notifications manually
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  const {
    recipient, type, title, message, priority = 'medium',
    relatedEntity, channels, actions
  } = req.body;
  
  if (!recipient || !type || !title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Please provide recipient, type, title, and message'
    });
  }
  
  const notification = await Notification.createNotification({
    recipient,
    sender: req.user._id,
    type,
    title,
    message,
    priority,
    relatedEntity,
    channels,
    actions
  });
  
  const populatedNotification = await Notification.findById(notification._id)
    .populate('sender', 'fullName email')
    .populate('recipient', 'fullName email');
  
  res.status(201).json({
    success: true,
    data: populatedNotification,
    message: 'Notification created successfully'
  });
}));

// @desc    Bulk operations on notifications
// @route   POST /api/notifications/bulk
// @access  Private
router.post('/bulk', authenticate, asyncHandler(async (req, res) => {
  const { action, notificationIds } = req.body;
  
  if (!action || !notificationIds || !Array.isArray(notificationIds)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide action and array of notification IDs'
    });
  }
  
  const filter = {
    _id: { $in: notificationIds },
    recipient: req.user._id
  };
  
  let updateData = {};
  let message = '';
  
  switch (action) {
    case 'mark_read':
      updateData = { status: 'read', readAt: new Date() };
      message = 'Notifications marked as read';
      break;
    case 'dismiss':
      updateData = { status: 'dismissed', dismissedAt: new Date() };
      message = 'Notifications dismissed';
      break;
    case 'archive':
      updateData = { status: 'archived' };
      message = 'Notifications archived';
      break;
    case 'delete':
      await Notification.deleteMany(filter);
      return res.status(200).json({
        success: true,
        message: 'Notifications deleted successfully'
      });
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
  }
  
  const result = await Notification.updateMany(filter, updateData);
  
  res.status(200).json({
    success: true,
    message,
    modifiedCount: result.modifiedCount
  });
}));

// @desc    Get real-time notification count
// @route   GET /api/notifications/count
// @access  Private
router.get('/count/unread', authenticate, asyncHandler(async (req, res) => {
  const unreadCount = await Notification.getUnreadCount(req.user._id);
  
  res.status(200).json({
    success: true,
    data: {
      unreadCount,
      timestamp: new Date()
    }
  });
}));

module.exports = router;