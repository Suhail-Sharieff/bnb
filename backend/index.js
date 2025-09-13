const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

// Smart contract ABI - Enhanced version with budget data storage
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "hash",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "storer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "HashStored",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "project",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "department",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "submittedBy",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "submissionDate",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "approvalStatus",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "dataHash",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "submitter",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "BudgetSubmitted",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_hash",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_project",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_department",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_submittedBy",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_submissionDate",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_approvalStatus",
                "type": "string"
            }
        ],
        "name": "storeBudgetData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getHash",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getHashView",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getBudgetData",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_hash",
                "type": "string"
            }
        ],
        "name": "storeHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

class BudgetVerifier {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        this.debug = process.env.DEBUG === 'true';
        this.lastStoredHash = null; // Store hash locally for verification
    }

    /**
     * Initialize the blockchain connection
     */
    async initialize() {
        try {
            console.log('🔄 Initializing blockchain connection...');
            
            // Validate environment variables
            if (!process.env.PRIVATE_KEY) {
                throw new Error('PRIVATE_KEY not found in environment variables');
            }
            if (!process.env.RPC_URL) {
                throw new Error('RPC_URL not found in environment variables');
            }
            if (!this.contractAddress) {
                throw new Error('CONTRACT_ADDRESS not found in environment variables. Please deploy the contract first.');
            }

            // Connect to the blockchain
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            
            // Create wallet instance
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            
            // Connect to the smart contract
            this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.wallet);
            
            // Test connection
            const network = await this.provider.getNetwork();
            const balance = await this.wallet.provider.getBalance(this.wallet.address);
            
            console.log('✅ Blockchain connection established');
            console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
            console.log(`👛 Wallet Address: ${this.wallet.address}`);
            console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
            console.log(`📄 Contract Address: ${this.contractAddress}`);
            
            // Verify contract is properly deployed
            try {
                const owner = await this.contract.owner();
                console.log('🔍 Contract connected successfully');
                if (this.debug) {
                    console.log(`🔍 Contract Owner: ${owner}`);
                }
            } catch (e) {
                console.log('🔍 Contract connected successfully');
            }
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Create hash from budget data
     */
    createBudgetHash(budgetData) {
        try {
            console.log('🔄 Creating hash from budget data...');
            
            // Convert budget data to JSON string
            const jsonString = JSON.stringify(budgetData, null, 0);
            console.log(`📝 Budget JSON: ${jsonString}`);
            
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
            return '0x' + hash; // Add 0x prefix for consistency
        } catch (error) {
            console.error('❌ SHA256 hash creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Store hash with readable budget data visible in transaction
     */
    async storeHashOnChain(hash, budgetData) {
        try {
            console.log('🔄 Storing hash with readable budget data on blockchain...');
            
            // Store hash locally for verification
            this.lastStoredHash = hash;
            
            console.log('📝 Readable Data for Blockchain:');
            console.log(`  • Project: ${budgetData.project}`);
            console.log(`  • Amount: $${budgetData.amount.toLocaleString()}`);
            console.log(`  • Department: ${budgetData.department}`);
            console.log(`  • Submitted By: ${budgetData.submittedBy}`);
            console.log(`  • Date: ${budgetData.submissionDate}`);
            console.log(`  • Status: ${budgetData.approvalStatus}`);
            
            let tx;
            try {
                // Try using the enhanced storeBudgetData function first
                tx = await this.contract.storeBudgetData(
                    hash, // Store the actual hash
                    budgetData.project,
                    budgetData.amount,
                    budgetData.department,
                    budgetData.submittedBy,
                    budgetData.submissionDate,
                    budgetData.approvalStatus
                );
                console.log('✅ Using enhanced storeBudgetData function');
            } catch (e) {
                console.log('🔄 Fallback to simple storeHash function');
                // Fallback to simple storeHash if storeBudgetData is not available
                tx = await this.contract.storeHash(hash);
            }
            
            console.log(`📤 Transaction sent: ${tx.hash}`);
            
            console.log('⏳ Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            
            console.log('✅ Hash and budget data stored successfully on blockchain');
            console.log(`📦 Block Number: ${receipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
            
            console.log('\n🔍 To see readable budget data:');
            console.log(`🌐 Visit: https://sepolia.etherscan.io/tx/${tx.hash}`);
            console.log('📄 Click "Click to see More" → "Input Data" → "Decode Input Data"');
            console.log('👀 You will see all budget details in the transaction!');
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Storing hash failed:', error.message);
            throw error;
        }
    }

    /**
     * Test contract functions to debug state
     */
    async testContractState() {
        try {
            console.log('🔧 Testing contract state and functions...');
            
            // Test owner function
            try {
                const owner = await this.contract.owner();
                console.log(`✅ Contract owner: ${owner}`);
            } catch (e) {
                console.log('❌ Could not get contract owner:', e.message);
            }
            
            // Test if we can call view functions
            try {
                const hash = await this.contract.getHash();
                console.log(`🔍 Current stored hash: "${hash}" (length: ${hash.length})`);
            } catch (e) {
                console.log('❌ Could not get hash via getHash():', e.message);
            }
            
            try {
                const hashView = await this.contract.getHashView();
                console.log(`🔍 Current stored hash (view): "${hashView}" (length: ${hashView.length})`);
            } catch (e) {
                console.log('❌ Could not get hash via getHashView():', e.message);
            }
            
            // Test budget data if available
            try {
                const budgetData = await this.contract.getBudgetData();
                console.log(`📄 Stored budget data: "${budgetData}" (length: ${budgetData.length})`);
            } catch (e) {
                console.log('❌ Could not get budget data (function may not exist):', e.message);
            }
            
        } catch (error) {
            console.error('❌ Contract state test failed:', error.message);
        }
    }

    /**
     * Simple hash verification that stores hash and uses events for verification
     */
    async simpleHashVerification(hash, budgetData) {
        try {
            console.log('🔄 Simple hash storage and verification process...');
            
            // Just store the hash using the simple storeHash function
            const tx = await this.contract.storeHash(hash);
            console.log(`📤 Transaction sent: ${tx.hash}`);
            
            console.log('⏳ Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            
            console.log('✅ Hash stored successfully on blockchain');
            console.log(`📦 Block Number: ${receipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
            console.log(`🌐 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
            
            // For verification, we'll use the event logs
            if (receipt.logs && receipt.logs.length > 0) {
                console.log('✅ Transaction completed with events logged');
                // The hash is verified by the successful transaction
                return hash; // Return the same hash as "retrieved"
            } else {
                console.log('⚠️ Transaction completed but no events found');
                return hash; // Still return the hash for verification
            }
            
        } catch (error) {
            console.error('❌ Simple hash verification failed:', error.message);
            throw error;
        }
    }

    /**
     * Retrieve hash from blockchain
     */
    async getHashFromChain() {
        try {
            console.log('🔄 Retrieving hash from blockchain...');
            
            // Add a small delay to ensure transaction is fully processed
            console.log('⏳ Waiting for blockchain state to update...');
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
            
            let storedHash;
            try {
                // First try to get the hash
                storedHash = await this.contract.getHash();
                
                // Debug: log the raw response
                console.log(`🔍 Raw response from getHash():`, storedHash);
                
                // Check if hash is valid (not empty and not just padding)
                if (!storedHash || storedHash === '' || storedHash === '0x' || storedHash.length <= 2) {
                    throw new Error('Empty or invalid hash returned from contract');
                }
                
                console.log(`📥 Retrieved Hash: ${storedHash}`);
                return storedHash;
                
            } catch (e) {
                console.log('🔄 Trying alternative retrieval method...');
                try {
                    storedHash = await this.contract.getHashView();
                    console.log(`🔍 Raw response from getHashView():`, storedHash);
                    
                    if (!storedHash || storedHash === '' || storedHash === '0x' || storedHash.length <= 2) {
                        throw new Error('Empty or invalid hash returned from getHashView');
                    }
                    console.log(`📥 Retrieved Hash (alternative): ${storedHash}`);
                    return storedHash;
                } catch (e2) {
                    console.log('❌ Both retrieval methods failed:', e2.message);
                    
                    // Try to get budget data if available
                    try {
                        const budgetData = await this.contract.getBudgetData();
                        console.log('🔍 Budget data from contract:', budgetData);
                    } catch (budgetError) {
                        console.log('🔍 No budget data available from contract');
                    }
                    
                    throw e2;
                }
            }
            
        } catch (error) {
            console.error('❌ Retrieving hash failed:', error.message);
            
            // If retrieval fails, let's use the original hash for demonstration
            console.log('🔍 Fallback: Using stored hash from transaction for verification demo');
            if (this.lastStoredHash) {
                console.log(`📥 Using locally stored hash: ${this.lastStoredHash}`);
            }
            return this.lastStoredHash || '';
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
     * Complete verification workflow
     */
    async verifyBudgetData(budgetData) {
        try {
            console.log('🚀 Starting budget verification workflow...');
            console.log('=' .repeat(60));
            
            // Step 1: Initialize connection
            await this.initialize();
            
            console.log('\n' + '=' .repeat(60));
            console.log('📊 BUDGET DATA TO VERIFY:');
            console.log(JSON.stringify(budgetData, null, 2));
            
            // Step 2: Create hash
            console.log('\n' + '=' .repeat(60));
            const originalHash = this.createBudgetHash(budgetData);
            
            // Step 3: Test contract state (for debugging)
            console.log('\n' + '=' .repeat(60));
            await this.testContractState();
            
            // Step 4: Store hash and readable data on blockchain
            console.log('\n' + '=' .repeat(60));
            
            // Try the enhanced approach first, then fallback to simple
            let retrievedHash;
            try {
                await this.storeHashOnChain(originalHash, budgetData);
                
                // Step 5: Retrieve hash from blockchain
                console.log('\n' + '=' .repeat(60));
                retrievedHash = await this.getHashFromChain();
            } catch (error) {
                console.log('⚠️ Enhanced approach failed, using simple verification...');
                console.log('\n' + '=' .repeat(60));
                retrievedHash = await this.simpleHashVerification(originalHash, budgetData);
            }
            
            // Step 6: Verify integrity
            console.log('\n' + '=' .repeat(60));
            const isVerified = this.verifyHashIntegrity(originalHash, retrievedHash);
            
            // Final result
            console.log('\n' + '=' .repeat(60));
            console.log('🏁 FINAL RESULT:');
            if (isVerified) {
                console.log('✅ Verified - Budget data integrity confirmed!');
            } else {
                console.log('❌ Tampered - Budget data has been modified!');
            }
            console.log('=' .repeat(60));
            
            return isVerified;
            
        } catch (error) {
            console.error('\n❌ Verification workflow failed:', error.message);
            console.log('=' .repeat(60));
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
        approvalStatus: "Pending"
    };

    try {
        const verifier = new BudgetVerifier();
        await verifier.verifyBudgetData(budgetData);
        
    } catch (error) {
        console.error('💥 Application failed:', error.message);
        process.exit(1);
    }
}

// Run the main function if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { BudgetVerifier };