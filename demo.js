const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

// Demo version that simulates blockchain operations
class BudgetVerifierDemo {
    constructor() {
        this.simulatedStorage = new Map(); // Simulates blockchain storage
        this.debug = true;
    }

    /**
     * Simulate blockchain connection
     */
    async initialize() {
        console.log('🔄 Initializing demo blockchain connection...');
        
        // Simulate wallet creation
        const wallet = ethers.Wallet.createRandom();
        
        console.log('✅ Demo blockchain connection established');
        console.log('📍 Network: Local Simulation');
        console.log(`👛 Demo Wallet Address: ${wallet.address}`);
        console.log('💰 Demo Balance: 100.0 ETH (simulated)');
        console.log('📄 Contract Address: 0x1234567890abcdef1234567890abcdef12345678 (simulated)');
        
        return true;
    }

    /**
     * Create hash from budget data
     */
    createBudgetHash(budgetData) {
        try {
            console.log('🔄 Creating hash from budget data...');
            
            // Convert budget data to JSON string
            const jsonString = JSON.stringify(budgetData, null, 0);
            console.log('📝 Budget JSON:');
            console.log(jsonString);
            
            // Create keccak256 hash (same as Ethereum's hashing)
            const hash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));
            
            console.log(`🔐 Generated Hash: ${hash}`);
            return hash;
            
        } catch (error) {
            console.error('❌ Hash creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Create SHA256 hash as alternative
     */
    createSHA256Hash(budgetData) {
        try {
            const jsonString = JSON.stringify(budgetData, null, 0);
            const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
            console.log('🔐 SHA256 Hash created successfully');
            return '0x' + hash; // Add 0x prefix for consistency
        } catch (error) {
            console.error('❌ SHA256 hash creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Simulate storing hash on blockchain
     */
    async storeHashOnChain(hash) {
        try {
            console.log('🔄 Storing hash on simulated blockchain...');
            
            // Simulate transaction
            const txHash = '0x' + crypto.randomBytes(32).toString('hex');
            console.log(`📤 Simulated Transaction: ${txHash}`);
            
            console.log('⏳ Simulating transaction confirmation...');
            
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Store in simulated blockchain
            this.simulatedStorage.set('storedHash', hash);
            this.simulatedStorage.set('blockNumber', Math.floor(Math.random() * 1000000));
            this.simulatedStorage.set('timestamp', Date.now());
            
            console.log('✅ Hash stored successfully on simulated blockchain');
            console.log(`📦 Simulated Block Number: ${this.simulatedStorage.get('blockNumber')}`);
            console.log('⛽ Simulated Gas Used: 45,239');
            console.log('📢 Simulated Event: HashStored');
            console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
            
            return {
                transactionHash: txHash,
                blockNumber: this.simulatedStorage.get('blockNumber'),
                gasUsed: 45239
            };
            
        } catch (error) {
            console.error('❌ Storing hash failed:', error.message);
            throw error;
        }
    }

    /**
     * Simulate retrieving hash from blockchain
     */
    async getHashFromChain() {
        try {
            console.log('🔄 Retrieving hash from simulated blockchain...');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const storedHash = this.simulatedStorage.get('storedHash');
            console.log(`📥 Retrieved Hash: ${storedHash}`);
            
            return storedHash;
            
        } catch (error) {
            console.error('❌ Retrieving hash failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify hash integrity
     */
    verifyHashIntegrity(originalHash, retrievedHash) {
        console.log('🔄 Verifying hash integrity...');
        console.log(`🔐 Original Hash:  ${originalHash}`);
        console.log(`📥 Retrieved Hash: ${retrievedHash}`);
        
        const isMatch = originalHash === retrievedHash;
        
        if (isMatch) {
            console.log('✅ Verified - Hash integrity maintained!');
            return true;
        } else {
            console.log('❌ Tampered - Hash mismatch detected!');
            return false;
        }
    }

    /**
     * Demonstrate tampering detection
     */
    async demonstrateTampering(originalBudgetData) {
        console.log('\n' + '='.repeat(60));
        console.log('🔍 DEMONSTRATING TAMPERING DETECTION');
        console.log('='.repeat(60));
        
        // Create tampered data
        const tamperedData = { ...originalBudgetData };
        tamperedData.amount = 2000000; // Changed from 1000000 to 2000000
        
        console.log('📊 ORIGINAL BUDGET DATA:');
        console.log(JSON.stringify(originalBudgetData, null, 2));
        
        console.log('\n📊 TAMPERED BUDGET DATA (amount changed):');
        console.log(JSON.stringify(tamperedData, null, 2));
        
        // Create hash of tampered data
        const tamperedHash = this.createBudgetHash(tamperedData);
        
        // Retrieve original hash from "blockchain"
        const originalStoredHash = await this.getHashFromChain();
        
        // Verify - should show tampering
        console.log('\n' + '='.repeat(60));
        const isTampered = this.verifyHashIntegrity(originalStoredHash, tamperedHash);
        
        if (!isTampered) {
            console.log('✅ TAMPERING DETECTED SUCCESSFULLY!');
            console.log('🛡️ The system correctly identified that the data was modified');
        }
        
        return !isTampered; // Return true if tampering was detected
    }

    /**
     * Complete verification workflow
     */
    async verifyBudgetData(budgetData) {
        try {
            console.log('🚀 Starting DEMO budget verification workflow...');
            console.log('=' .repeat(60));
            
            // Step 1: Initialize connection
            await this.initialize();
            
            console.log('\n' + '=' .repeat(60));
            console.log('📊 BUDGET DATA TO VERIFY:');
            console.log(JSON.stringify(budgetData, null, 2));
            
            // Step 2: Create hash
            console.log('\n' + '=' .repeat(60));
            const originalHash = this.createBudgetHash(budgetData);
            
            // Also show SHA256 for comparison
            const sha256Hash = this.createSHA256Hash(budgetData);
            console.log('\n🔍 Hash Comparison:');
            console.log(`  • keccak256: ${originalHash}`);
            console.log(`  • SHA256:    ${sha256Hash}`);
            
            // Step 3: Store hash on blockchain
            console.log('\n' + '=' .repeat(60));
            await this.storeHashOnChain(originalHash);
            
            // Step 4: Retrieve hash from blockchain
            console.log('\n' + '=' .repeat(60));
            const retrievedHash = await this.getHashFromChain();
            
            // Step 5: Verify integrity
            console.log('\n' + '=' .repeat(60));
            const isVerified = this.verifyHashIntegrity(originalHash, retrievedHash);
            
            // Step 6: Demonstrate tampering detection
            await this.demonstrateTampering(budgetData);
            
            // Final result
            console.log('\n' + '=' .repeat(60));
            console.log('🏁 FINAL DEMO RESULTS:');
            if (isVerified) {
                console.log('✅ Verified - Budget data integrity confirmed!');
            } else {
                console.log('❌ Tampered - Budget data has been modified!');
            }
            
            console.log('\n🎓 EDUCATIONAL SUMMARY:');
            console.log('• Hash Creation: ✅ Demonstrated keccak256 and SHA256 hashing');
            console.log('• Blockchain Storage: ✅ Simulated smart contract storage');
            console.log('• Data Retrieval: ✅ Simulated blockchain data retrieval');
            console.log('• Integrity Verification: ✅ Demonstrated hash comparison');
            console.log('• Tampering Detection: ✅ Showed how modifications are detected');
            
            console.log('\n📝 TO USE WITH REAL BLOCKCHAIN:');
            console.log('1. Get testnet tokens from faucets');
            console.log('2. Run: npm run deploy');
            console.log('3. Run: npm start');
            
            console.log('=' .repeat(60));
            
            return isVerified;
            
        } catch (error) {
            console.error('\n❌ Demo workflow failed:', error.message);
            throw error;
        }
    }
}

// Main execution function
async function main() {
    // Example budget data
    const budgetData = {
        project: "School Project X",
        amount: 1000000,
        department: "Science",
        submittedBy: "John Doe",
        submissionDate: "2024-01-15",
        approvalStatus: "Pending",
        category: "Research Equipment",
        requestId: "REQ-2024-001"
    };

    try {
        const verifier = new BudgetVerifierDemo();
        await verifier.verifyBudgetData(budgetData);
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('🔗 This demonstrates exactly how the real blockchain version works!');
        
    } catch (error) {
        console.error('💥 Demo failed:', error.message);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    main();
}

module.exports = { BudgetVerifierDemo };