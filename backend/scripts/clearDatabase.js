const mongoose = require('mongoose');
const User = require('../models/User');
const BudgetRequest = require('../models/BudgetRequest');
const BudgetTransaction = require('../models/BudgetTransaction');
const Notification = require('../models/Notification');
require('dotenv').config();

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
    console.log('🧹 Clearing all collections...');
    
    // Clear all collections
    await User.deleteMany({});
    console.log('✅ Users collection cleared');
    
    await BudgetRequest.deleteMany({});
    console.log('✅ Budget requests collection cleared');
    
    await BudgetTransaction.deleteMany({});
    console.log('✅ Budget transactions collection cleared');
    
    await Notification.deleteMany({});
    console.log('✅ Notifications collection cleared');
    
    console.log('🎉 All database collections cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  }
}

async function main() {
  await connectDB();
  await clearDatabase();
  await mongoose.connection.close();
  console.log('📴 Database connection closed');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { clearDatabase };