const BlockchainService = require('../services/blockchainService');
const mongoose = require('mongoose');
require('dotenv').config();

async function deployContracts() {
  try {
    console.log('🚀 Starting contract deployment...');
    
    // Initialize blockchain service
    const blockchain = new BlockchainService();
    await blockchain.initialize(process.env.NETWORK || 'sepolia');
    
    // Deploy main contract
    console.log('\n📋 Deploying FundAllocationManager contract...');
    const deployment = await blockchain.deployContract('FundAllocationManager');
    
    console.log('\n✅ Deployment Summary:');
    console.log(`📍 Contract Address: ${deployment.address}`);
    console.log(`🌐 Network: ${deployment.deploymentInfo.network}`);
    console.log(`👤 Deployer: ${deployment.deploymentInfo.deployer}`);
    console.log(`📅 Deployed At: ${deployment.deploymentInfo.deployedAt}`);
    
    // Test basic functionality
    console.log('\n🧪 Testing contract functionality...');
    
    // Test dashboard stats
    try {
      const stats = await blockchain.getDashboardStats();
      console.log('📊 Dashboard Stats Retrieved:', stats);
    } catch (error) {
      console.log('⚠️  Dashboard stats test failed (expected for new contract)');
    }
    
    console.log('\n🎉 Contract deployment completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Update your .env file with the new contract address');
    console.log('2. Fund the deployer wallet for gas fees');
    console.log('3. Test the contract with the frontend application');
    
    return deployment;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  await deployContracts();
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { deployContracts };