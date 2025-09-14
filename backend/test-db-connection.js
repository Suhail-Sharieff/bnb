const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB connection
const testConnection = async () => {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    
    if (!process.env.MONGODB_URI) {
      console.log('Please check your .env file for MONGODB_URI');
      process.exit(1);
    }
    
    // Try to connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Remove deprecated options
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Import User model
    const User = require('./models/User');
    
    // Check if there are any users
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    // Check vendor users
    const vendorCount = await User.countDocuments({ role: 'vendor' });
    console.log(`🏢 Vendor users: ${vendorCount}`);
    
    if (vendorCount > 0) {
      const vendors = await User.find({ role: 'vendor' }).select('-password').limit(5);
      console.log('\n📋 Sample vendor users:');
      vendors.forEach((vendor, index) => {
        console.log(`  ${index + 1}. ${vendor.fullName} (${vendor.email})`);
        console.log(`     Company: ${vendor.companyName || 'N/A'}`);
        console.log(`     Wallet: ${vendor.walletAddress || 'N/A'}`);
        console.log(`     Active: ${vendor.isActive ? 'Yes' : 'No'}\n`);
      });
    }
    
    // Check admin users
    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log(`🔐 Admin users: ${adminCount}`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();