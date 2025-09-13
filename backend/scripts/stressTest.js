const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('../models/User');
const FundAllocation = require('../models/FundAllocation');
const VendorWallet = require('../models/VendorWallet');
const BudgetRequest = require('../models/BudgetRequest');

// Constants for stress testing
const VENDOR_COUNT = 60; // More than 50 as requested
const ALLOCATION_COUNT = 120; // More than 100 as requested
const CONCURRENT_REQUESTS = 10; // Number of concurrent API calls
const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api';

// Performance tracking
const performanceMetrics = {
  startTime: null,
  endTime: null,
  totalOperations: 0,
  successfulOperations: 0,
  failedOperations: 0,
  responseTimeSum: 0,
  maxResponseTime: 0,
  minResponseTime: Infinity,
  errors: [],
  memoryUsage: [],
  operationsPerSecond: 0
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://vyashwanth179:yash2006@cluster0.lit5icl.mongodb.net';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB for stress testing');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Generate random data
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateRandomEmail = () => {
  return `vendor${generateRandomString(6)}@test.com`;
};

const generateRandomAmount = () => {
  return Math.floor(Math.random() * 100000) + 5000; // Between $5,000 and $105,000
};

const categories = [
  'Infrastructure', 'Software Development', 'Marketing', 'HR', 'Operations',
  'Research', 'Equipment', 'Training', 'Consulting', 'Maintenance',
  'Security', 'Legal', 'Finance', 'Support', 'Analytics'
];

const departments = [
  'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations',
  'IT', 'Legal', 'Research', 'Support', 'Quality', 'Security'
];

const projects = [
  'Web Platform Upgrade', 'Mobile App Development', 'Data Migration',
  'Security Enhancement', 'Performance Optimization', 'User Experience Improvement',
  'Integration Project', 'Compliance Update', 'Infrastructure Modernization',
  'Analytics Implementation', 'Automation Initiative', 'Training Program'
];

// Memory usage tracking
const trackMemoryUsage = () => {
  const memUsage = process.memoryUsage();
  performanceMetrics.memoryUsage.push({
    timestamp: Date.now(),
    rss: memUsage.rss / 1024 / 1024, // MB
    heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
    heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
    external: memUsage.external / 1024 / 1024 // MB
  });
};

// Performance timer
const startTimer = () => {
  return Date.now();
};

const endTimer = (startTime) => {
  const responseTime = Date.now() - startTime;
  performanceMetrics.responseTimeSum += responseTime;
  performanceMetrics.maxResponseTime = Math.max(performanceMetrics.maxResponseTime, responseTime);
  performanceMetrics.minResponseTime = Math.min(performanceMetrics.minResponseTime, responseTime);
  return responseTime;
};

// Create stress test vendors
const createStressTestVendors = async () => {
  console.log(`\n🏗️  Creating ${VENDOR_COUNT} vendor accounts...`);
  const vendors = [];
  
  for (let i = 0; i < VENDOR_COUNT; i++) {
    const vendor = new User({
      fullName: `Stress Test Vendor ${i + 1}`,
      email: generateRandomEmail(),
      password: 'password123', // Will be hashed by pre-save middleware
      role: 'vendor',
      isVerified: true,
      companyName: `Test Company ${i + 1}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      reputationScore: Math.floor(Math.random() * 50) + 50, // 50-100
      notifications: {
        email: Math.random() > 0.5,
        push: Math.random() > 0.5,
        sms: Math.random() > 0.3
      }
    });
    
    try {
      const savedVendor = await vendor.save();
      vendors.push(savedVendor);
      
      // Create vendor wallet
      const wallet = new VendorWallet({
        vendor: savedVendor._id,
        balance: 0,
        totalAllocated: 0,
        totalWithdrawn: 0,
        pendingAmount: 0,
        walletAddress: `0x${generateRandomString(40)}`,
        status: 'active',
        autoWithdraw: {
          enabled: Math.random() > 0.5,
          threshold: generateRandomAmount(),
          frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)]
        },
        security: {
          twoFactorEnabled: Math.random() > 0.7,
          lastActivity: new Date(),
          loginAttempts: 0
        }
      });
      
      await wallet.save();
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Created ${i + 1}/${VENDOR_COUNT} vendors`);
        trackMemoryUsage();
      }
    } catch (error) {
      console.error(`   ❌ Error creating vendor ${i + 1}:`, error.message);
      performanceMetrics.errors.push({
        operation: 'create_vendor',
        index: i + 1,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
  
  console.log(`✅ Successfully created ${vendors.length}/${VENDOR_COUNT} vendors`);
  return vendors;
};

// Create stress test allocations
const createStressTestAllocations = async (vendors) => {
  console.log(`\n💰 Creating ${ALLOCATION_COUNT} fund allocations...`);
  const allocations = [];
  
  // Get admin user for approvals
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('No admin user found. Please run database seeding first.');
  }
  
  for (let i = 0; i < ALLOCATION_COUNT; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const amount = generateRandomAmount();
    
    const allocation = new FundAllocation({
      vendor: vendor._id,
      amount: amount,
      category: categories[Math.floor(Math.random() * categories.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      project: projects[Math.floor(Math.random() * projects.length)],
      description: `Stress test allocation ${i + 1} for ${vendor.name}`,
      status: ['pending', 'approved', 'allocated', 'completed'][Math.floor(Math.random() * 4)],
      priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
      approvedBy: Math.random() > 0.3 ? admin._id : null,
      approvedAt: Math.random() > 0.3 ? new Date() : null,
      blockchainHash: Math.random() > 0.5 ? `0x${generateRandomString(64)}` : null,
      milestones: [
        {
          name: 'Initial Setup',
          description: 'Project initialization and setup',
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          status: 'pending',
          amount: amount * 0.3
        },
        {
          name: 'Development Phase',
          description: 'Main development work',
          dueDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000),
          status: 'pending',
          amount: amount * 0.5
        },
        {
          name: 'Final Delivery',
          description: 'Project completion and delivery',
          dueDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
          status: 'pending',
          amount: amount * 0.2
        }
      ],
      autoRelease: {
        enabled: Math.random() > 0.6,
        conditions: {
          documentsSubmitted: Math.random() > 0.5,
          milestoneCompleted: Math.random() > 0.5,
          adminApproval: Math.random() > 0.7
        },
        releasePercentage: Math.floor(Math.random() * 100) + 1
      },
      compliance: {
        documentsRequired: ['invoice', 'receipt', 'report'],
        documentsSubmitted: [],
        verified: false,
        lastAudit: null
      }
    });
    
    try {
      const savedAllocation = await allocation.save();
      allocations.push(savedAllocation);
      
      // Update vendor wallet if allocation is approved/allocated
      if (['approved', 'allocated', 'completed'].includes(allocation.status)) {
        await VendorWallet.findOneAndUpdate(
          { vendor: vendor._id },
          {
            $inc: {
              totalAllocated: amount,
              balance: allocation.status === 'allocated' ? amount : 0,
              pendingAmount: allocation.status === 'approved' ? amount : 0
            }
          }
        );
      }
      
      if ((i + 1) % 20 === 0) {
        console.log(`   ✅ Created ${i + 1}/${ALLOCATION_COUNT} allocations`);
        trackMemoryUsage();
      }
    } catch (error) {
      console.error(`   ❌ Error creating allocation ${i + 1}:`, error.message);
      performanceMetrics.errors.push({
        operation: 'create_allocation',
        index: i + 1,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
  
  console.log(`✅ Successfully created ${allocations.length}/${ALLOCATION_COUNT} allocations`);
  return allocations;
};

// Simulate concurrent API load
const simulateConcurrentAPILoad = async () => {
  console.log('\n🚀 Simulating concurrent API load...');
  
  // Get admin token for API calls
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('No admin user found');
  }
  
  // Simulate login to get token
  let adminToken;
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: admin.email,
      password: 'admin123' // Default admin password from seeding
    });
    adminToken = loginResponse.data.token;
  } catch (error) {
    console.error('❌ Failed to login admin for API testing:', error.message);
    return;
  }
  
  const apiCalls = [];
  
  // Create multiple concurrent API calls
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    apiCalls.push(
      // Dashboard API call
      axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).then(response => ({ success: true, endpoint: 'dashboard', responseTime: Date.now() }))
        .catch(error => ({ success: false, endpoint: 'dashboard', error: error.message })),
      
      // Fund allocations API call
      axios.get(`${API_BASE_URL}/admin/allocations?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).then(response => ({ success: true, endpoint: 'allocations', responseTime: Date.now() }))
        .catch(error => ({ success: false, endpoint: 'allocations', error: error.message })),
      
      // Vendors API call
      axios.get(`${API_BASE_URL}/admin/vendors?page=1&limit=30`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).then(response => ({ success: true, endpoint: 'vendors', responseTime: Date.now() }))
        .catch(error => ({ success: false, endpoint: 'vendors', error: error.message }))
    );
  }
  
  const startTime = Date.now();
  const results = await Promise.all(apiCalls);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ API Load Test Results:`);
  console.log(`      - Total requests: ${results.length}`);
  console.log(`      - Successful: ${successful}`);
  console.log(`      - Failed: ${failed}`);
  console.log(`      - Total time: ${endTime - startTime}ms`);
  console.log(`      - Average response time: ${(endTime - startTime) / results.length}ms`);
  
  return results;
};

// Clean up stress test data
const cleanupStressTestData = async () => {
  console.log('\n🧹 Cleaning up stress test data...');
  
  try {
    // Delete stress test vendors and related data
    const stressTestVendors = await User.find({ 
      name: { $regex: /^Stress Test Vendor/ },
      role: 'vendor'
    });
    
    const vendorIds = stressTestVendors.map(v => v._id);
    
    // Delete allocations
    const deletedAllocations = await FundAllocation.deleteMany({
      vendor: { $in: vendorIds }
    });
    
    // Delete vendor wallets
    const deletedWallets = await VendorWallet.deleteMany({
      vendor: { $in: vendorIds }
    });
    
    // Delete vendor users
    const deletedVendors = await User.deleteMany({
      _id: { $in: vendorIds }
    });
    
    console.log(`   ✅ Cleanup completed:`);
    console.log(`      - Deleted ${deletedVendors.deletedCount} vendor accounts`);
    console.log(`      - Deleted ${deletedWallets.deletedCount} vendor wallets`);
    console.log(`      - Deleted ${deletedAllocations.deletedCount} fund allocations`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
};

// Generate stress test report
const generateStressTestReport = () => {
  const duration = performanceMetrics.endTime - performanceMetrics.startTime;
  const avgResponseTime = performanceMetrics.responseTimeSum / performanceMetrics.totalOperations;
  const operationsPerSecond = (performanceMetrics.totalOperations / duration) * 1000;
  
  const report = {
    summary: {
      duration: `${(duration / 1000).toFixed(2)} seconds`,
      totalOperations: performanceMetrics.totalOperations,
      successfulOperations: performanceMetrics.successfulOperations,
      failedOperations: performanceMetrics.failedOperations,
      successRate: `${((performanceMetrics.successfulOperations / performanceMetrics.totalOperations) * 100).toFixed(2)}%`,
      operationsPerSecond: operationsPerSecond.toFixed(2),
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${performanceMetrics.maxResponseTime}ms`,
      minResponseTime: `${performanceMetrics.minResponseTime}ms`
    },
    dataCreated: {
      vendors: VENDOR_COUNT,
      allocations: ALLOCATION_COUNT,
      totalRecords: VENDOR_COUNT + ALLOCATION_COUNT + VENDOR_COUNT // vendors + allocations + wallets
    },
    memoryUsage: {
      samples: performanceMetrics.memoryUsage.length,
      peakMemoryMB: Math.max(...performanceMetrics.memoryUsage.map(m => m.heapUsed)).toFixed(2),
      avgMemoryMB: (performanceMetrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / performanceMetrics.memoryUsage.length).toFixed(2)
    },
    errors: performanceMetrics.errors,
    performance: {
      passedThreshold: operationsPerSecond > 10 && avgResponseTime < 1000, // 10 ops/sec, <1s response
      recommendation: operationsPerSecond > 10 ? 
        'System performance is within acceptable limits for production use.' :
        'Consider optimizing database queries and API endpoints for better performance.'
    }
  };
  
  console.log('\n📊 STRESS TEST REPORT');
  console.log('========================');
  console.log(`Duration: ${report.summary.duration}`);
  console.log(`Total Operations: ${report.summary.totalOperations}`);
  console.log(`Success Rate: ${report.summary.successRate}`);
  console.log(`Operations/Second: ${report.summary.operationsPerSecond}`);
  console.log(`Average Response Time: ${report.summary.averageResponseTime}`);
  console.log(`Peak Memory Usage: ${report.memoryUsage.peakMemoryMB} MB`);
  console.log(`Performance Status: ${report.performance.passedThreshold ? '✅ PASSED' : '⚠️  NEEDS OPTIMIZATION'}`);
  console.log(`Recommendation: ${report.performance.recommendation}`);
  
  if (report.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${report.errors.length}`);
    report.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.operation}: ${error.error}`);
    });
  }
  
  return report;
};

// Main stress test function
const runStressTest = async () => {
  console.log('🔥 STARTING COMPREHENSIVE STRESS TEST');
  console.log('=====================================');
  console.log(`Target: ${VENDOR_COUNT} vendors, ${ALLOCATION_COUNT} allocations`);
  console.log(`Concurrent API requests: ${CONCURRENT_REQUESTS}`);
  
  performanceMetrics.startTime = Date.now();
  
  try {
    // Connect to database
    await connectDB();
    
    // Track initial memory
    trackMemoryUsage();
    
    // Step 1: Create vendors
    const startVendorTime = startTimer();
    const vendors = await createStressTestVendors();
    endTimer(startVendorTime);
    performanceMetrics.totalOperations += vendors.length;
    performanceMetrics.successfulOperations += vendors.length;
    
    // Step 2: Create allocations
    const startAllocationTime = startTimer();
    const allocations = await createStressTestAllocations(vendors);
    endTimer(startAllocationTime);
    performanceMetrics.totalOperations += allocations.length;
    performanceMetrics.successfulOperations += allocations.length;
    
    // Step 3: Simulate API load
    const apiResults = await simulateConcurrentAPILoad();
    performanceMetrics.totalOperations += apiResults.length;
    performanceMetrics.successfulOperations += apiResults.filter(r => r.success).length;
    performanceMetrics.failedOperations += apiResults.filter(r => !r.success).length;
    
    // Track final memory
    trackMemoryUsage();
    
    performanceMetrics.endTime = Date.now();
    
    // Generate and display report
    const report = generateStressTestReport();
    
    // Cleanup (optional - comment out to keep test data)
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      await cleanupStressTestData();
    } else {
      console.log('\n💡 Test data preserved. Run with --cleanup flag to remove test data.');
    }
    
    console.log('\n🎉 STRESS TEST COMPLETED SUCCESSFULLY!');
    
    // Exit with appropriate code
    process.exit(report.performance.passedThreshold ? 0 : 1);
    
  } catch (error) {
    console.error('❌ STRESS TEST FAILED:', error);
    performanceMetrics.endTime = Date.now();
    generateStressTestReport();
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Stress test interrupted. Cleaning up...');
  await cleanupStressTestData();
  process.exit(1);
});

// Run the stress test
if (require.main === module) {
  runStressTest();
}

module.exports = {
  runStressTest,
  createStressTestVendors,
  createStressTestAllocations,
  simulateConcurrentAPILoad,
  cleanupStressTestData,
  generateStressTestReport
};
