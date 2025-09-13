const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BudgetRequest = require('../models/BudgetRequest');
const BudgetTransaction = require('../models/BudgetTransaction');
const Notification = require('../models/Notification');

// Middleware to authenticate token
exports.authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Middleware to check user roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Middleware to check if user is vendor
exports.isVendor = (req, res, next) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Vendor access required'
    });
  }
  next();
};

// Middleware for rate limiting (basic implementation)
exports.rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const requestTimes = requests.get(ip);
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    recentRequests.push(now);
    requests.set(ip, recentRequests);
    
    next();
  };
};

// Middleware to validate request body
exports.validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

// Middleware to log API requests
exports.logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - User: ${req.user ? req.user.email : 'Anonymous'}`);
  next();
};

// Error handling middleware
exports.errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  let error = { ...err };
  error.message = err.message;
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware to check blockchain transaction integrity
exports.verifyBlockchainIntegrity = async (req, res, next) => {
  try {
    if (req.body.transactionHash) {
      // Here you would verify the transaction hash against blockchain
      // For now, we'll just check if it's a valid format
      const hashPattern = /^0x[a-fA-F0-9]{64}$/;
      if (!hashPattern.test(req.body.transactionHash)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blockchain transaction hash format'
        });
      }
    }
    next();
  } catch (error) {
    console.error('Blockchain verification error:', error);
    next(error);
  }
};

// Middleware to check user permissions for specific resources
exports.checkResourcePermission = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }
      
      // Admin can access everything
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }
      
      // Check if user owns the resource or is assigned to it
      const isOwner = resource.requester && resource.requester.toString() === req.user._id.toString();
      const isAssigned = resource.assignedVendor && resource.assignedVendor.toString() === req.user._id.toString();
      const isCreator = resource.createdBy && resource.createdBy.toString() === req.user._id.toString();
      
      if (!isOwner && !isAssigned && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource permission check error:', error);
      next(error);
    }
  };
};

// Middleware to create audit log
exports.auditLog = (action) => {
  return async (req, res, next) => {
    try {
      const auditData = {
        user: req.user._id,
        action: action,
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        requestBody: req.method !== 'GET' ? req.body : null,
        resourceId: req.params.id || null
      };
      
      // Store audit log (you can create an AuditLog model for this)
      console.log('Audit Log:', auditData);
      
      next();
    } catch (error) {
      console.error('Audit log error:', error);
      next();
    }
  };
};

// Middleware to validate file uploads
exports.validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
    maxFiles = 5
  } = options;
  
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    if (req.files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxFiles} files allowed`
      });
    }
    
    for (const file of req.files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
        });
      }
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed`
        });
      }
    }
    
    next();
  };
};

// Middleware to handle async errors
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};