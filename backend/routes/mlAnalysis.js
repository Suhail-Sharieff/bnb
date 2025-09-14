const express = require('express');
const multer = require('multer');
const path = require('path');
const MLAnalysisService = require('../services/mlAnalysisService');
const { authenticate, isVendor, isAdmin, asyncHandler } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ml/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ml-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and CSV files are allowed.'));
    }
  }
});

// @desc    Upload file for ML analysis
// @route   POST /api/ml/upload
// @access  Private (Admin/Vendor)
router.post('/upload', 
  authenticate, 
  upload.single('file'),
  asyncHandler(async (req, res) => {
    console.log('ML Upload request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Check if ML API is healthy
      console.log('Checking ML API health before upload');
      const isMLAPIHealthy = await MLAnalysisService.isHealthy();
      if (!isMLAPIHealthy) {
        console.warn('ML analysis service is currently unavailable');
        return res.status(503).json({
          success: false,
          message: 'ML analysis service is currently unavailable. Please try again later.'
        });
      }

      // Upload file to ML API
      console.log('Uploading file to ML API');
      const mlResponse = await MLAnalysisService.uploadFile(req.file);
      
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully for analysis',
        data: {
          fileId: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mlAnalysis: mlResponse
        }
      });
    } catch (error) {
      console.error('Error processing ML file upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process file upload',
        error: error.message
      });
    }
  })
);

// @desc    Ask questions about uploaded data
// @route   POST /api/ml/chat
// @access  Private (Admin/Vendor)
router.post('/chat', 
  authenticate,
  asyncHandler(async (req, res) => {
    console.log('ML Chat request received');
    const { question, sessionId } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    try {
      // Check if ML API is healthy
      console.log('Checking ML API health before chat');
      const isMLAPIHealthy = await MLAnalysisService.isHealthy();
      if (!isMLAPIHealthy) {
        console.warn('ML analysis service is currently unavailable');
        return res.status(503).json({
          success: false,
          message: 'ML analysis service is currently unavailable. Please try again later.'
        });
      }

      // Ask question to ML API
      console.log('Asking question to ML API');
      const mlResponse = await MLAnalysisService.askQuestion(question, sessionId);
      
      res.status(200).json({
        success: true,
        message: 'Question processed successfully',
        data: mlResponse
      });
    } catch (error) {
      console.error('Error processing ML question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process question',
        error: error.message
      });
    }
  })
);

// @desc    Get ML service health status
// @route   GET /api/ml/health
// @access  Public
router.get('/health', asyncHandler(async (req, res) => {
  console.log('ML Health check request received');
  try {
    const isHealthy = await MLAnalysisService.isHealthy();
    
    res.status(200).json({
      success: true,
      message: 'ML analysis service status',
      data: {
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in health check endpoint:', error);
    res.status(200).json({
      success: true,
      message: 'ML analysis service status',
      data: {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
}));

module.exports = router;