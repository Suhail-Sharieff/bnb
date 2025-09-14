const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const BudgetRequest = require('../models/BudgetRequest');
const BudgetTransaction = require('../models/BudgetTransaction');
const Notification = require('../models/Notification');
require('dotenv').config();

const sampleUsers = [
  {
    fullName: 'Admin User',
    email: 'admin@company.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    isVerified: true,
    reputationScore: 100
  },
  {
    fullName: 'John Smith',
    email: 'john.smith@company.com',
    password: 'user123',
    role: 'vendor',
    department: 'IT Services',
    companyName: 'TechCorp Solutions',
    taxId: 'TC123456789',
    walletAddress: '0x742d35Cc6634C0532925a3b8D0Ac6F5DE4b88BAd',
    isVerified: true,
    reputationScore: 85
  },
  {
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    password: 'user123',
    role: 'vendor',
    department: 'Marketing',
    companyName: 'Creative Designs LLC',
    taxId: 'CD987654321',
    walletAddress: '0x8ba1f109551bD432803012645Hac136c54621e50',
    isVerified: true,
    reputationScore: 92
  },
  {
    fullName: 'Mike Chen',
    email: 'mike.chen@company.com',
    password: 'user123',
    role: 'vendor',
    department: 'Operations',
    companyName: 'Logistics Pro',
    taxId: 'LP456789123',
    walletAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    isVerified: true,
    reputationScore: 78
  },
  {
    fullName: 'Emily Davis',
    email: 'emily.davis@company.com',
    password: 'user123',
    role: 'auditor',
    department: 'Finance',
    isVerified: true,
    reputationScore: 95
  }
];

const sampleBudgetRequests = [
  {
    department: 'IT',
    project: 'Server Infrastructure Upgrade',
    category: 'infrastructure',
    amount: 50000,
    description: 'Upgrade server infrastructure to support increased workload and improve performance.',
    justification: 'Current servers are running at 90% capacity and causing performance issues.',
    priority: 'high',
    state: 'approved',
    tags: ['infrastructure', 'servers', 'upgrade']
  },
  {
    department: 'Marketing',
    project: 'Digital Marketing Campaign Q4',
    category: 'marketing',
    amount: 25000,
    description: 'Launch comprehensive digital marketing campaign for Q4 sales push.',
    justification: 'Market research shows 35% increase in digital engagement in Q4.',
    priority: 'medium',
    state: 'pending',
    tags: ['marketing', 'digital', 'q4']
  },
  {
    department: 'HR',
    project: 'Employee Training Program',
    category: 'services',
    amount: 15000,
    description: 'Implement comprehensive training program for new employees.',
    justification: 'Reduce onboarding time and improve employee satisfaction scores.',
    priority: 'medium',
    state: 'allocated',
    tags: ['training', 'hr', 'employees']
  },
  {
    department: 'Operations',
    project: 'Warehouse Management System',
    category: 'software',
    amount: 35000,
    description: 'Implement new WMS to streamline inventory management.',
    justification: 'Current manual processes causing 15% inventory discrepancies.',
    priority: 'high',
    state: 'completed',
    tags: ['wms', 'inventory', 'automation']
  },
  {
    department: 'R&D',
    project: 'Product Research Initiative',
    category: 'research',
    amount: 75000,
    description: 'Research and development for next-generation product line.',
    justification: 'Market opportunity identified worth $2M in potential revenue.',
    priority: 'urgent',
    state: 'approved',
    tags: ['research', 'product', 'innovation']
  }
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blockchain-budget-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  try {
    await User.deleteMany({});
    await BudgetRequest.deleteMany({});
    await BudgetTransaction.deleteMany({});
    await Notification.deleteMany({});
    console.log('🧹 Database cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  }
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  const createdUsers = [];
  
  for (const userData of sampleUsers) {
    const user = await User.create(userData);
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.fullName} (${user.role})`);
  }
  
  return createdUsers;
}

async function seedBudgetRequests(users) {
  console.log('📋 Seeding budget requests...');
  
  const admin = users.find(u => u.role === 'admin');
  const vendors = users.filter(u => u.role === 'vendor');
  
  const createdRequests = [];
  
  for (let i = 0; i < sampleBudgetRequests.length; i++) {
    const requestData = sampleBudgetRequests[i];
    const requester = admin; // Admin creates all requests for demo
    
    const requestId = `BR-${Date.now() + i}-${Math.random().toString(36).substr(2, 9)}`;
    
    const budgetRequest = await BudgetRequest.create({
      ...requestData,
      requestId,
      requester: requester._id,
      requiredByDate: new Date(Date.now() + (30 + i * 10) * 24 * 60 * 60 * 1000), // 30-80 days from now
      requestedDate: new Date(Date.now() - (i * 5) * 24 * 60 * 60 * 1000), // Staggered creation dates
    });
    
    // Assign vendors to allocated/completed requests
    if (['allocated', 'completed'].includes(requestData.state) && vendors.length > 0) {
      const vendor = vendors[i % vendors.length];
      budgetRequest.assignedVendor = vendor._id;
      budgetRequest.allocatedAmount = requestData.amount;
      budgetRequest.approvedBy = admin._id;
      budgetRequest.approvedAt = new Date(Date.now() - (i * 2) * 24 * 60 * 60 * 1000);
      
      if (requestData.state === 'allocated') {
        budgetRequest.allocatedAt = new Date(Date.now() - (i * 1) * 24 * 60 * 60 * 1000);
      } else if (requestData.state === 'completed') {
        budgetRequest.allocatedAt = new Date(Date.now() - (i * 2) * 24 * 60 * 60 * 1000);
        budgetRequest.completedAt = new Date(Date.now() - (i * 0.5) * 24 * 60 * 60 * 1000);
      }
      
      // Update vendor stats
      vendor.totalAllocated += requestData.amount;
      if (requestData.state === 'completed') {
        vendor.totalWithdrawn += requestData.amount;
        vendor.completedProjects += 1;
      }
      await vendor.save();
    }
    
    // Set approval for approved requests
    if (['approved'].includes(requestData.state)) {
      budgetRequest.approvedBy = admin._id;
      budgetRequest.approvedAt = new Date(Date.now() - (i * 2) * 24 * 60 * 60 * 1000);
    }
    
    await budgetRequest.save();
    createdRequests.push(budgetRequest);
    console.log(`✅ Created budget request: ${budgetRequest.project} (${budgetRequest.state})`);
  }
  
  return createdRequests;
}

async function seedTransactions(requests, users) {
  console.log('💰 Seeding blockchain transactions...');
  
  const completedRequests = requests.filter(r => r.state === 'completed');
  
  for (const request of completedRequests) {
    // Generate proper transaction hash (66 characters: 0x + 64 hex chars)
    const transactionHash = '0x' + require('crypto').randomBytes(32).toString('hex');
    
    // Generate proper data hash (66 characters: 0x + 64 hex chars)
    const dataHash = '0x' + require('crypto').randomBytes(32).toString('hex');
    
    const transaction = await BudgetTransaction.create({
      transactionHash: transactionHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      contractAddress: '0x1234567890123456789012345678901234567890',
      gasUsed: (Math.random() * 100000 + 50000).toFixed(0),
      networkName: 'sepolia',
      project: request.project,
      amount: request.amount,
      department: request.department,
      submittedBy: users.find(u => u.role === 'admin').fullName,
      submissionDate: request.completedAt,
      approvalStatus: 'completed',
      dataHash: dataHash,
      createdBy: request.requester,
      approvedBy: request.approvedBy,
      category: request.category,
      vendor: request.assignedVendor ? users.find(u => u._id.equals(request.assignedVendor)).companyName : null,
      budgetRequestId: request.requestId,
      vendorAddress: request.assignedVendor ? users.find(u => u._id.equals(request.assignedVendor)).walletAddress : null,
      complianceMet: true,
      fundsReleased: true,
      releasedAmount: request.amount,
      allocatedAt: request.allocatedAt,
      releasedAt: request.completedAt
    });
    
    console.log(`✅ Created transaction: ${transaction.transactionHash.substr(0, 10)}...`);
  }
}

async function seedNotifications(users, requests) {
  console.log('🔔 Seeding notifications...');
  
  const admin = users.find(u => u.role === 'admin');
  const vendors = users.filter(u => u.role === 'vendor');
  
  // Create welcome notifications for all users
  for (const user of users) {
    await Notification.create({
      recipient: user._id,
      type: 'system_alert',
      title: 'Welcome to Financial Transparency Platform',
      message: `Welcome ${user.fullName}! Your ${user.role} account is ready to use. Explore the platform features and start managing your budget requests.`,
      priority: 'medium',
      status: 'unread'
    });
  }
  
  // Create budget-related notifications
  const pendingRequests = requests.filter(r => r.state === 'pending');
  for (const request of pendingRequests) {
    await Notification.create({
      recipient: admin._id,
      type: 'budget_request_created',
      title: 'New Budget Request Pending',
      message: `Budget request for ${request.project} ($${request.amount.toLocaleString()}) is awaiting your approval.`,
      relatedEntity: {
        entityType: 'BudgetRequest',
        entityId: request._id
      },
      priority: request.priority === 'urgent' ? 'high' : 'medium',
      status: 'unread'
    });
  }
  
  // Create allocation notifications for vendors
  const allocatedRequests = requests.filter(r => r.state === 'allocated');
  for (const request of allocatedRequests.slice(0, 2)) { // Limit to first 2
    const vendor = users.find(u => u._id.equals(request.assignedVendor));
    if (vendor) {
      await Notification.create({
        recipient: vendor._id,
        sender: admin._id,
        type: 'funds_allocated',
        title: 'Funds Allocated to Your Project',
        message: `Congratulations! You have been allocated $${request.amount.toLocaleString()} for project: ${request.project}. Please complete the compliance requirements to access the funds.`,
        relatedEntity: {
          entityType: 'BudgetRequest',
          entityId: request._id
        },
        priority: 'high',
        status: 'unread'
      });
    }
  }
  
  console.log('✅ Notifications created');
}

async function addGamificationData(users) {
  console.log('🎮 Adding gamification data...');
  
  const vendors = users.filter(u => u.role === 'vendor');
  
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    
    // Award some points and badges
    vendor.points = Math.floor(Math.random() * 500) + 100;
    
    // Add some badges
    const badges = [
      { name: 'Early Adopter', description: 'One of the first vendors on the platform', earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { name: 'Compliance Champion', description: 'Always submits complete documentation', earnedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { name: 'Quick Responder', description: 'Responds to requests within 24 hours', earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    ];
    
    // Randomly assign 1-2 badges
    const numBadges = Math.floor(Math.random() * 2) + 1;
    vendor.badges = badges.slice(0, numBadges);
    
    await vendor.save();
    console.log(`✅ Added gamification data for ${vendor.fullName}`);
  }
}

async function generateReports() {
  console.log('📊 Generating sample analytics...');
  
  // This would typically be done through the API, but we'll just log what reports would be available
  const totalRequests = await BudgetRequest.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalTransactions = await BudgetTransaction.countDocuments();
  
  console.log(`📈 Platform Statistics:`);
  console.log(`   - Total Budget Requests: ${totalRequests}`);
  console.log(`   - Total Users: ${totalUsers}`);
  console.log(`   - Total Transactions: ${totalTransactions}`);
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    console.log('🧹 Clearing existing data...');
    await clearDatabase();
    
    console.log('👥 Creating users...');
    const users = await seedUsers();
    
    console.log('📋 Creating budget requests...');
    const requests = await seedBudgetRequests(users);
    
    console.log('💰 Creating transactions...');
    await seedTransactions(requests, users);
    
    console.log('🔔 Creating notifications...');
    await seedNotifications(users, requests);
    
    console.log('🎮 Adding gamification data...');
    await addGamificationData(users);
    
    console.log('📊 Generating reports...');
    await generateReports();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Accounts Created:');
    console.log('Admin: admin@company.com / admin123');
    console.log('Vendor: john.smith@company.com / user123');
    console.log('Vendor: sarah.johnson@company.com / user123');
    console.log('Vendor: mike.chen@company.com / user123');
    console.log('Auditor: emily.davis@company.com / user123');
    
    console.log('\n💡 You can now start the server and test the platform!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
  }
}

async function main() {
  await seedDatabase();
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { seedDatabase };