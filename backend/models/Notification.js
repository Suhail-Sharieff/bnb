const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'budget_request_created',
      'budget_request_approved',
      'budget_request_rejected',
      'budget_request_allocated',
      'budget_request_completed',
      'funds_allocated',
      'funds_released',
      'compliance_required',
      'compliance_verified',
      'document_uploaded',
      'deadline_approaching',
      'system_alert',
      'gamification_reward',
      'reputation_change',
      'security_alert'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['BudgetRequest', 'BudgetTransaction', 'User', 'System']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed', 'archived'],
    default: 'unread'
  },
  readAt: Date,
  dismissedAt: Date,
  
  // Delivery channels
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  
  // Delivery status
  deliveryStatus: {
    inApp: {
      delivered: Boolean,
      deliveredAt: Date
    },
    email: {
      delivered: Boolean,
      deliveredAt: Date,
      opened: Boolean,
      openedAt: Date
    },
    sms: {
      delivered: Boolean,
      deliveredAt: Date
    },
    push: {
      delivered: Boolean,
      deliveredAt: Date,
      clicked: Boolean,
      clickedAt: Date
    }
  },
  
  // Action buttons/links
  actions: [{
    label: String,
    type: {
      type: String,
      enum: ['link', 'button', 'api_call']
    },
    url: String,
    apiEndpoint: String,
    method: String,
    payload: mongoose.Schema.Types.Mixed
  }],
  
  // Metadata
  metadata: {
    source: String,
    campaignId: String,
    batchId: String,
    templateId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Virtual for formatted creation time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffInMs = now - created;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;
  
  if (diffInHours < 1) {
    const diffInMinutes = diffInMs / (1000 * 60);
    return `${Math.floor(diffInMinutes)} minutes ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else if (diffInDays < 30) {
    return `${Math.floor(diffInDays)} days ago`;
  } else {
    return created.toLocaleDateString();
  }
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to dismiss
notificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // Here you would integrate with real-time notification service
  // Example: Socket.io emit to specific user
  if (global.io) {
    global.io.to(`user_${data.recipient}`).emit('new_notification', notification);
  }
  
  return notification;
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    status: 'unread'
  });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, status: 'unread' },
    { status: 'read', readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);