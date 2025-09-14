const mongoose = require('mongoose');
const { dbManager } = require('./config/database');
const BudgetTransaction = require('./models/BudgetTransaction');

async function verifyTransactions() {
  try {
    await dbManager.connect();
    console.log('Connected to database');
    
    // Find all transactions
    const transactions = await BudgetTransaction.find().limit(10);
    
    if (transactions.length === 0) {
      console.log('No transactions found in the database');
      process.exit(0);
    }
    
    console.log(`Found ${transactions.length} transactions. Verifying integrity...\n`);
    
    for (const tx of transactions) {
      console.log(`Transaction: ${tx.project}`);
      console.log(`  Amount: $${tx.amount}`);
      console.log(`  Transaction Hash: ${tx.transactionHash}`);
      console.log(`  Data Hash: ${tx.dataHash}`);
      console.log(`  Verification Status: ${tx.verificationStatus}`);
      console.log(`  Created At: ${tx.createdAt}`);
      console.log(`  Is Verified: ${tx.verificationStatus === 'verified' ? 'YES' : 'NO'}`);
      console.log('---');
    }
    
    // Count verified vs tampered
    const verifiedCount = transactions.filter(tx => tx.verificationStatus === 'verified').length;
    const tamperedCount = transactions.filter(tx => tx.verificationStatus === 'tampered').length;
    const pendingCount = transactions.filter(tx => tx.verificationStatus === 'pending').length;
    
    console.log(`\nSummary:`);
    console.log(`  Verified transactions: ${verifiedCount}`);
    console.log(`  Tampered transactions: ${tamperedCount}`);
    console.log(`  Pending verification: ${pendingCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error verifying transactions:', error.message);
    process.exit(1);
  }
}

verifyTransactions();