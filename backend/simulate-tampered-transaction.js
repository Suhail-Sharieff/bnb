const mongoose = require('mongoose');
const { dbManager } = require('./config/database');
const BudgetTransaction = require('./models/BudgetTransaction');
const User = require('./models/User');

async function simulateTamperedTransaction() {
  try {
    await dbManager.connect();
    console.log('Connected to database');
    
    // Find an admin user to use as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    // Create a new transaction with verified status
    const newTransaction = new BudgetTransaction({
      transactionHash: '0x4d5e6f7890123456789012345678901234567890123456789012345678901235',
      blockNumber: 1234570,
      contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      gasUsed: '32000',
      networkName: 'sepolia',
      project: 'IT Equipment Upgrade',
      amount: 30000,
      department: 'IT',
      submittedBy: 'Sarah Wilson',
      submissionDate: new Date('2024-02-01'),
      approvalStatus: 'allocated',
      budgetRequestId: 'BR004',
      vendorAddress: '0x5e6f789012345678901234567890123456789012',
      dataHash: '0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
      hashAlgorithm: 'keccak256',
      verificationStatus: 'verified',
      createdBy: adminUser._id,
      approvedBy: adminUser._id,
      category: 'allocation',
      vendor: 'Tech Solutions Ltd'
    });
    
    await newTransaction.save();
    console.log('Created new verified transaction:', newTransaction.project);
    
    // Now simulate tampering by changing the verification status
    newTransaction.verificationStatus = 'tampered';
    await newTransaction.save();
    console.log('Simulated tampering by changing verification status to "tampered"');
    
    // Verify the transaction status
    const updatedTransaction = await BudgetTransaction.findById(newTransaction._id);
    console.log(`\nTransaction verification status: ${updatedTransaction.verificationStatus}`);
    console.log(`Is tampered: ${updatedTransaction.verificationStatus === 'tampered' ? 'YES' : 'NO'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error simulating tampered transaction:', error.message);
    process.exit(1);
  }
}

simulateTamperedTransaction();