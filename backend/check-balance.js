const { ethers } = require('ethers');
const BlockchainService = require('./services/blockchainService');
require('dotenv').config();

async function checkBalance() {
  try {
    // Check if environment variables are set
    if (!process.env.SEPOLIA_RPC_URL) {
      console.log('SEPOLIA_RPC_URL not found in environment variables');
      console.log('Please set SEPOLIA_RPC_URL in your .env file');
      process.exit(1);
    }
    
    if (!process.env.TEST_WALLET_ADDRESS) {
      console.log('TEST_WALLET_ADDRESS not found in environment variables');
      console.log('Please set TEST_WALLET_ADDRESS in your .env file');
      process.exit(1);
    }
    
    // Initialize blockchain service
    const blockchainService = new BlockchainService();
    await blockchainService.initialize('sepolia');
    
    // Get wallet balance using the service
    const balanceInfo = await blockchainService.getWalletBalance(process.env.TEST_WALLET_ADDRESS);
    
    console.log('Wallet Balance Check');
    console.log('===================');
    console.log(`Address: ${balanceInfo.address}`);
    console.log(`Balance: ${balanceInfo.balance} ETH`);
    console.log(`Balance (wei): ${balanceInfo.balanceWei}`);
    console.log(`Network: ${balanceInfo.network}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking balance:', error.message);
    process.exit(1);
  }
}

checkBalance();