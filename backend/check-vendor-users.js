const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blockchain-budget-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Check vendor users
const checkVendorUsers = async () => {
  try {
    await connectDB();
    
    console.log('\n=== Checking Vendor Users ===\n');
    
    // Find all users
    const allUsers = await User.find({}).select('-password');
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Find vendor users
    const vendorUsers = await User.find({ role: 'vendor' }).select('-password');
    console.log(`Vendor users: ${vendorUsers.length}`);
    
    if (vendorUsers.length > 0) {
      console.log('\nVendor Users Details:');
      vendorUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.fullName} (${user.email})`);
        console.log(`   Company: ${user.companyName || 'N/A'}`);
        console.log(`   Wallet Address: ${user.walletAddress || 'N/A'}`);
        console.log(`   Reputation Score: ${user.reputationScore || 0}`);
        console.log(`   Level: ${user.level || 'bronze'}`);
        console.log(`   Total Allocated: $${user.totalAllocated || 0}`);
        console.log(`   Total Withdrawn: $${user.totalWithdrawn || 0}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('\nNo vendor users found in the database.');
    }
    
    // Find admin users
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    console.log(`\nAdmin users: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\nAdmin Users Details:');
      adminUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.fullName} (${user.email})`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking vendor users:', error);
    process.exit(1);
  }
};

checkVendorUsers();