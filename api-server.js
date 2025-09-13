const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { BudgetVerifier } = require('./index.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Global budget verifier instance
let budgetVerifier = null;

// Initialize verifier
async function initializeVerifier() {
    try {
        budgetVerifier = new BudgetVerifier();
        await budgetVerifier.initialize();
        console.log('✅ Budget verifier initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize budget verifier:', error.message);
    }
}

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Blockchain Budget Verification API is running',
        timestamp: new Date().toISOString(),
        network: process.env.NETWORK_NAME || 'sepolia',
        contract: process.env.CONTRACT_ADDRESS || 'Not deployed'
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
    console.log(`🌐 Network: ${process.env.NETWORK_NAME || 'sepolia'}`);
    console.log(`📄 Contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log('='.repeat(60));
    
    // Initialize budget verifier
    await initializeVerifier();
    
    console.log('✅ API Server ready for Postman testing!');
    console.log('🔗 Use these endpoints in Postman:');
    console.log(`   POST http://localhost:${PORT}/api/budget/verify`);
    console.log(`   GET  http://localhost:${PORT}/health`);
});

module.exports = app;