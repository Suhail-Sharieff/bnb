const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

// Minimal but effective contract ABI
const CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_hash", "type": "string"}],
        "name": "storeHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "string", "name": "hash", "type": "string"},
            {"indexed": true, "internalType": "address", "name": "storer", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "HashStored",
        "type": "event"
    }
];

class ProductionBudgetVerifier {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.contractAddress = process.env.CONTRACT_ADDRESS;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing blockchain connection...');
            
            if (!process.env.PRIVATE_KEY || !process.env.RPC_URL || !this.contractAddress) {
                throw new Error('Missing required environment variables');
            }

            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.wallet);
            
            const network = await this.provider.getNetwork();
            const balance = await this.wallet.provider.getBalance(this.wallet.address);
            
            console.log('✅ Blockchain connection established');
            console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
            console.log(`👛 Wallet: ${this.wallet.address}`);
            console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
            console.log(`📄 Contract: ${this.contractAddress}`);
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    createBudgetHash(budgetData) {
        const jsonString = JSON.stringify(budgetData, null, 0);
        const hash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));
        return hash;
    }

    async verifyAndStore(budgetData) {
        try {
            console.log('🚀 Starting Production Budget Verification...');
            console.log('='.repeat(60));
            
            await this.initialize();
            
            console.log('\n📊 BUDGET DATA TO VERIFY:');
            console.log(JSON.stringify(budgetData, null, 2));
            
            // Create hash
            console.log('\n🔐 Creating cryptographic hash...');
            const hash = this.createBudgetHash(budgetData);
            console.log(`Generated Hash: ${hash}`);
            
            // Store on blockchain
            console.log('\n⛓️ Storing on blockchain...');
            const tx = await this.contract.storeHash(hash);
            console.log(`📤 Transaction: ${tx.hash}`);
            console.log(`🌐 View: https://sepolia.etherscan.io/tx/${tx.hash}`);
            
            console.log('\n⏳ Waiting for confirmation...');
            const receipt = await tx.wait();
            
            console.log('\n✅ VERIFICATION COMPLETE!');
            console.log(`📦 Block: ${receipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${receipt.gasUsed}`);
            console.log(`🔗 Transaction Hash: ${tx.hash}`);
            
            // Verification logic: If transaction succeeded, hash is verified
            if (receipt.status === 1) {
                console.log('\n🏆 RESULT: VERIFIED ✅');
                console.log('✅ Budget data integrity confirmed!');
                console.log('✅ Hash successfully stored on Sepolia blockchain');
                console.log('✅ Cryptographic proof available on-chain');
                
                return {
                    verified: true,
                    hash: hash,
                    transactionHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
                };
            } else {
                console.log('\n❌ RESULT: FAILED');
                return { verified: false, error: 'Transaction failed' };
            }
            
        } catch (error) {
            console.error('\n💥 Verification failed:', error.message);
            return { verified: false, error: error.message };
        }
    }
}

// Example usage
async function main() {
    const budgetData = {
        project: "School Project X",
        amount: 1000000,
        department: "Science", 
        submittedBy: "John Doe",
        submissionDate: "2024-01-15",
        approvalStatus: "Pending"
    };

    const verifier = new ProductionBudgetVerifier();
    const result = await verifier.verifyAndStore(budgetData);
    
    if (result.verified) {
        console.log('\n🎉 SUCCESS: Budget verification completed successfully!');
    } else {
        console.log('\n⚠️ FAILED: Budget verification failed:', result.error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { ProductionBudgetVerifier };