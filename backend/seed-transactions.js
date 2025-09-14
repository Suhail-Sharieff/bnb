const mongoose = require('mongoose');
const { dbManager } = require('./config/database');
const BudgetTransaction = require('./models/BudgetTransaction');
const User = require('./models/User');

async function seedTransactions() {
  try {
    await dbManager.connect();
    console.log('Connected to database');
    
    // Clear existing transactions
    await BudgetTransaction.deleteMany({});
    console.log('Cleared existing transactions');
    
    // Find an admin user to use as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    // Generate sample transactions
    const sampleTransactions = [
      {
        transactionHash: '0x1a2b3c4d5e6f7890123456789012345678901234567890123456789012345678',
        blockNumber: 1234567,
        contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        gasUsed: '21000',
        networkName: 'sepolia',
        project: 'School Infrastructure Upgrade',
        amount: 50000,
        department: 'Education',
        submittedBy: 'John Smith',
        submissionDate: new Date('2024-01-15'),
        approvalStatus: 'approved',
        budgetRequestId: 'BR001',
        vendorAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        dataHash: '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        hashAlgorithm: 'keccak256',
        verificationStatus: 'verified',
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        category: 'allocation',
        vendor: 'ABC Construction Ltd'
      },
      {
        transactionHash: '0x2b3c4d5e6f789012345678901234567890123456789012345678901234567890',
        blockNumber: 1234568,
        contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        gasUsed: '35000',
        networkName: 'sepolia',
        project: 'Library Book Acquisition',
        amount: 15000,
        department: 'Library',
        submittedBy: 'Jane Doe',
        submissionDate: new Date('2024-01-20'),
        approvalStatus: 'allocated',
        budgetRequestId: 'BR002',
        vendorAddress: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
        dataHash: '0x4e08a02d2d0f0a7a8b7c7d7e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
        hashAlgorithm: 'keccak256',
        verificationStatus: 'verified',
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        category: 'allocation',
        vendor: 'XYZ Book Suppliers'
      },
      {
        transactionHash: '0x3c4d5e6f78901234567890123456789012345678901234567890123456789012',
        blockNumber: 1234569,
        contractAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        gasUsed: '28000',
        networkName: 'sepolia',
        project: 'Athletic Equipment',
        amount: 25000,
        department: 'Athletics',
        submittedBy: 'Mike Johnson',
        submissionDate: new Date('2024-01-25'),
        approvalStatus: 'completed',
        budgetRequestId: 'BR003',
        vendorAddress: '0x4d9f8a7b6c5e4d3c2b1a0f9e8d7c6b5a43210fed',
        dataHash: '0x5f19b13d3e1f2a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7890',
        hashAlgorithm: 'keccak256',
        verificationStatus: 'verified',
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        category: 'allocation',
        vendor: 'Sports Gear Inc'
      }
    ];
    
    // Insert sample transactions
    for (const txData of sampleTransactions) {
      const transaction = new BudgetTransaction(txData);
      await transaction.save();
      console.log(`Created transaction: ${transaction.project} - $${transaction.amount}`);
    }
    
    console.log('Sample transactions created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding transactions:', error.message);
    process.exit(1);
  }
}

seedTransactions();