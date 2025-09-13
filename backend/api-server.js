const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const { BudgetVerifier } = require('./index.js');
const { dbManager } = require('./config/database');
const { upload, uploadToCloudinary } = require('./config/cloudinary');
const User = require('./models/User');
const BudgetTransaction = require('./models/BudgetTransaction');
const Department = require('./models/Department');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Additional CORS middleware for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// JWT secrets (using provided credentials)
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'blockchain-budget-verifier-secret-key';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Helper function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      fullName: user.fullName 
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Helper function to generate refresh token
function generateRefreshToken(user) {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Global budget verifier instance
let budgetVerifier = null;

// Initialize database and budget verifier
async function initializeServices() {
    try {
        console.log('🔄 Starting service initialization...');
        
        // Connect to MongoDB
        await dbManager.connect();
        await dbManager.initializeData();
        console.log('✅ Database connected and initialized');
        
        // Initialize budget verifier (optional - only if blockchain config is complete)
        if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here_without_0x_prefix') {
            try {
                budgetVerifier = new BudgetVerifier();
                await budgetVerifier.initialize();
                console.log('✅ Budget verifier initialized successfully');
            } catch (blockchainError) {
                console.log('⚠️ Blockchain initialization failed, but API server will continue without blockchain features');
                console.log('   Configure PRIVATE_KEY in .env to enable blockchain features');
            }
        } else {
            console.log('⚠️ Blockchain features disabled - PRIVATE_KEY not configured');
            console.log('   Add your private key to .env to enable blockchain verification');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        return false;
    }
}

// Routes

/**
 * Simple connection test endpoint
 */
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend connection successful',
        timestamp: new Date().toISOString(),
        server: 'Express.js',
        port: PORT
    });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const dbInfo = dbManager.getConnectionInfo();
    res.json({
        status: 'healthy',
        message: 'Blockchain Budget Verification API is running',
        timestamp: new Date().toISOString(),
        services: {
            database: {
                connected: dbInfo.isConnected,
                status: dbInfo.readyState,
                collections: dbInfo.collections.length
            },
            blockchain: {
                network: process.env.NETWORK_NAME || 'sepolia',
                contract: process.env.CONTRACT_ADDRESS || 'Not deployed'
            }
        }
    });
});

/**
 * Get wallet balance
 */
app.get('/balance', async (req, res) => {
    try {
        if (!budgetVerifier) {
            return res.status(503).json({
                error: 'Budget verifier not initialized',
                message: 'Please wait for system initialization'
            });
        }

        const balance = await budgetVerifier.provider.getBalance(budgetVerifier.wallet.address);
        const balanceEth = ethers.formatEther(balance);

        res.json({
            success: true,
            data: {
                address: budgetVerifier.wallet.address,
                balance: balanceEth,
                currency: 'ETH',
                network: process.env.NETWORK_NAME || 'sepolia'
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get balance',
            message: error.message
        });
    }
});

/**
 * User registration endpoint (MongoDB integrated)
 * POST /api/auth/signup
 */
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        // Validate required fields
        if (!email || !password || !fullName || !role) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'email, password, fullName, and role are required'
            });
        }

        // Validate role
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be either "admin" or "user"'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email already exists'
            });
        }

        // Create new user (password will be hashed by pre-save middleware)
        const newUser = new User({
            email: email.toLowerCase(),
            fullName,
            role,
            password
        });

        await newUser.save();

        // Generate JWT tokens
        const token = generateToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        console.log(`✅ New user registered: ${email} (${role})`);
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: {
                    id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    role: newUser.role,
                    createdAt: newUser.createdAt
                },
                token,
                refreshToken,
                expiresIn: ACCESS_TOKEN_EXPIRY
            }
        });

    } catch (error) {
        console.error('❌ Signup failed:', error.message);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                error: 'Validation failed',
                message: errors.join(', ')
            });
        }
        
        res.status(500).json({
            error: 'Registration failed',
            message: 'Internal server error during registration'
        });
    }
});

/**
 * User login endpoint (MongoDB integrated)
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }

        // Find user by email (including password field)
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                error: 'Account disabled',
                message: 'Your account has been deactivated'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Update last login
        await user.updateLastLogin();

        // Generate JWT tokens
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`✅ User logged in: ${email}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                },
                token,
                refreshToken,
                expiresIn: ACCESS_TOKEN_EXPIRY
            }
        });

    } catch (error) {
        console.error('❌ Login failed:', error.message);
        res.status(500).json({
            error: 'Login failed',
            message: 'Internal server error during login'
        });
    }
});

/**
 * File upload endpoint (Cloudinary integrated)
 * POST /api/upload
 */
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file provided',
                message: 'Please select a file to upload'
            });
        }

        const { originalname, mimetype, size, buffer } = req.file;
        const { folder = 'documents', description = '' } = req.body;
        
        console.log(`📎 Uploading file: ${originalname} (${(size / 1024).toFixed(2)}KB)`);

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(buffer, {
            folder: `blockchain-budget-verifier/${folder}`,
            resource_type: 'auto',
            public_id: `${Date.now()}_${originalname.split('.')[0]}`
        });

        // Save file info to database (you can create a File model for this)
        const fileData = {
            originalName: originalname,
            fileName: uploadResult.public_id,
            fileUrl: uploadResult.secure_url,
            fileType: mimetype,
            fileSize: size,
            uploadedBy: req.user.id,
            description,
            cloudinaryId: uploadResult.public_id,
            folder,
            uploadedAt: new Date()
        };

        console.log(`✅ File uploaded successfully: ${uploadResult.secure_url}`);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                file: fileData,
                cloudinary: {
                    publicId: uploadResult.public_id,
                    url: uploadResult.secure_url,
                    format: uploadResult.format,
                    resourceType: uploadResult.resource_type
                }
            }
        });

    } catch (error) {
        console.error('❌ File upload failed:', error.message);
        
        // Handle specific multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'File size must be less than 10MB'
            });
        }
        
        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                error: 'Invalid file type',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Upload failed',
            message: 'Internal server error during file upload'
        });
    }
});

/**
 * Submit budget for verification
 * POST /api/budget/verify
 */
app.post('/api/budget/verify', async (req, res) => {
    try {
        if (!budgetVerifier) {
            return res.status(503).json({
                error: 'Budget verifier not initialized',
                message: 'Please wait for system initialization'
            });
        }

        const { project, amount, department, submittedBy, submissionDate, approvalStatus } = req.body;

        // Validate required fields
        if (!project || !amount || !department) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'project, amount, and department are required',
                required: ['project', 'amount', 'department'],
                optional: ['submittedBy', 'submissionDate', 'approvalStatus']
            });
        }

        // Create budget data object
        const budgetData = {
            project: project,
            amount: parseInt(amount),
            department: department,
            submittedBy: submittedBy || 'API User',
            submissionDate: submissionDate || new Date().toISOString().split('T')[0],
            approvalStatus: approvalStatus || 'Pending'
        };

        console.log(`📊 Processing budget verification for: ${project}`);

        // Create hash
        const hash = budgetVerifier.createBudgetHash(budgetData);
        
        // Store on blockchain
        const receipt = await budgetVerifier.storeHashOnChain(hash, budgetData);
        
        // Get transaction URL for Etherscan
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        const explorerUrl = networkName === 'sepolia' 
            ? `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
            : `https://polygonscan.com/tx/${receipt.transactionHash}`;

        res.json({
            success: true,
            message: 'Budget verification completed successfully',
            data: {
                budgetData: budgetData,
                hash: hash,
                blockchain: {
                    transactionHash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    explorerUrl: explorerUrl,
                    network: networkName
                },
                verification: {
                    status: 'Verified',
                    timestamp: new Date().toISOString(),
                    cryptographicProof: hash
                }
            }
        });

    } catch (error) {
        console.error('❌ Budget verification failed:', error.message);
        res.status(500).json({
            error: 'Budget verification failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Verify existing budget data against blockchain
 * POST /api/budget/check
 */
app.post('/api/budget/check', async (req, res) => {
    try {
        if (!budgetVerifier) {
            return res.status(503).json({
                error: 'Budget verifier not initialized'
            });
        }

        const budgetData = req.body;

        // Create hash from provided data
        const currentHash = budgetVerifier.createBudgetHash(budgetData);
        
        // Get stored hash from blockchain
        const storedHash = await budgetVerifier.getHashFromChain();
        
        // Verify integrity
        const isVerified = budgetVerifier.verifyHashIntegrity(currentHash, storedHash);

        res.json({
            success: true,
            data: {
                budgetData: budgetData,
                verification: {
                    status: isVerified ? 'Verified' : 'Tampered',
                    currentHash: currentHash,
                    storedHash: storedHash,
                    isMatch: isVerified,
                    timestamp: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Verification check failed',
            message: error.message
        });
    }
});

/**
 * Get stored budget hash from blockchain
 */
app.get('/api/budget/hash', async (req, res) => {
    try {
        if (!budgetVerifier) {
            return res.status(503).json({
                error: 'Budget verifier not initialized'
            });
        }

        const storedHash = await budgetVerifier.getHashFromChain();

        res.json({
            success: true,
            data: {
                storedHash: storedHash,
                contract: process.env.CONTRACT_ADDRESS,
                network: process.env.NETWORK_NAME || 'sepolia',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve hash',
            message: error.message
        });
    }
});

/**
 * Get API documentation
 */
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Blockchain Budget Verification API',
        version: '1.0.0',
        description: 'REST API for blockchain-based budget data verification',
        endpoints: {
            'GET /health': 'System health check',
            'GET /balance': 'Get wallet balance',
            'POST /api/budget/verify': 'Submit budget for blockchain verification',
            'POST /api/budget/check': 'Check budget data against blockchain',
            'GET /api/budget/hash': 'Get stored hash from blockchain',
            'GET /api/docs': 'This documentation'
        },
        exampleRequest: {
            endpoint: 'POST /api/budget/verify',
            body: {
                project: 'School Project X',
                amount: 1000000,
                department: 'Science',
                submittedBy: 'John Doe',
                submissionDate: '2024-01-15',
                approvalStatus: 'Pending'
            }
        },
        blockchain: {
            network: process.env.NETWORK_NAME || 'sepolia',
            contract: process.env.CONTRACT_ADDRESS,
            explorer: 'https://sepolia.etherscan.io/'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('🚀 Blockchain Budget Verification API Server Started');
    console.log('='.repeat(60));
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
    console.log('='.repeat(60));
    
    // Initialize all services
    const initialized = await initializeServices();
    
    if (initialized) {
        console.log('✅ API Server ready with MongoDB integration!');
        console.log('🔗 Available endpoints:');
        console.log(`   POST http://localhost:${PORT}/api/auth/signup`);
        console.log(`   POST http://localhost:${PORT}/api/auth/login`);
        console.log(`   POST http://localhost:${PORT}/api/budget/verify`);
        console.log(`   GET  http://localhost:${PORT}/health`);
        console.log(`🌐 Database: MongoDB connected`);
        console.log(`🌐 Blockchain: ${process.env.NETWORK_NAME || 'sepolia'}`);
    } else {
        console.log('❌ Server started but some services failed to initialize');
    }
});

module.exports = app;