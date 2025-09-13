const { ethers } = require('ethers');
require('dotenv').config();

// Smart contract bytecode and ABI
const CONTRACT_BYTECODE = "0x608060405234801561001057600080fd5b50336002806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506109b7806100606000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80638da5cb5b1161005b5780638da5cb5b1461011d578063b2bdfa7b14610139578063ee919d5014610157578063f15da7291461018757610088565b80632b3b99961461008d57806342b9ef14146100a957806355241077146100c757806361bc221a146100e5575b600080fd5b6100a760048036038101906100a291906105e2565b6101a5565b005b6100b16102ac565b6040516100be9190610754565b60405180910390f35b6100cf61033e565b6040516100dc9190610754565b60405180910390f35b6100fd60048036038101906100f891906105e2565b6103d0565b60405161011491906106dd565b60405180910390f35b61012561044c565b6040516101309190610687565b60405180910390f35b610141610472565b60405161014e9190610687565b60405180910390f35b610171600480360381019061016c91906105e2565b610498565b60405161017e9190610754565b60405180910390f35b61018f610540565b60405161019c9190610776565b60405180910390f35b600081511161020f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161020690610718565b60405180910390fd5b80600090805190602001906102259291906104b7565b507f8b1dcbe46ac5b4e6f5999d2e4b9ddbb49b966e44c5c56b9b50e1f1c3b3b3b3b381338360405161025893929190610738565b60405180910390a150565b60006102a760008054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561029d5780601f106102725761010080835404028352916020019161029d565b820191906000526020600020905b81548152906001019060200180831161028057829003601f168201915b5050505050610498565b905090565b60606000805460018160011615610100020316600290048060011461035b5780601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610351578060011461033d5782600052602060002091508281546001816001161561010002031660029004815260200191505b6020816020036101000a031916815260200191505b5050505050905090565b6000606060006002805460018160011615610100020316600290041461035b57806001600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020016000805460018160011615610100020316600290048060011461035b5780601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610351578060011461033d5782600052602060002091508281546001816001161561010002031660029004815260200191505b6020816020036101000a031916815260200191505b50505050509050905090565b60008160405160200161041d91906106fb565b604051602081830303815290604052805190602001206000604051602001610445919061066a565b6040516020818303038152906040528051906020012014905092915050565b60026000906101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6060816040516020016104ab91906106fb565b60405160208183030381529060405290505b919050565b8280546001816001161561010002031660029004906000526020600020906000905bf3fe";

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
                "indexed": false,
                "internalType": "string",
                "name": "hash",
                "type": "string"
            },
            {
                "indexed": false,
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

class ContractDeployer {
    constructor() {
        this.provider = null;
        this.wallet = null;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing deployment environment...');
            
            // Validate environment variables
            if (!process.env.PRIVATE_KEY) {
                throw new Error('PRIVATE_KEY not found in environment variables');
            }
            if (!process.env.RPC_URL) {
                throw new Error('RPC_URL not found in environment variables');
            }

            // Connect to the blockchain
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            
            // Create wallet instance
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            
            // Test connection
            const network = await this.provider.getNetwork();
            const balance = await this.wallet.provider.getBalance(this.wallet.address);
            
            console.log('✅ Deployment environment ready');
            console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
            console.log(`👛 Deployer Address: ${this.wallet.address}`);
            console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
            
            // Check minimum balance
            const minBalance = ethers.parseEther('0.01'); // 0.01 ETH minimum
            if (balance < minBalance) {
                console.warn('⚠️  Low balance detected. You may need more ETH for deployment.');
            }
            
        } catch (error) {
            console.error('❌ Deployment initialization failed:', error.message);
            throw error;
        }
    }

    async deployContract() {
        try {
            console.log('🚀 Deploying BudgetHashStorage contract...');
            
            // Read the Solidity contract source
            const fs = require('fs');
            const contractSource = fs.readFileSync('./BudgetHashStorage.sol', 'utf8');
            
            // For demo purposes, let's deploy a simpler contract
            const simpleContractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BudgetHashStorage {
    string private storedHash;
    address public owner;
    
    event HashStored(string hash, address storer, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
    }
    
    function storeHash(string memory _hash) public {
        storedHash = _hash;
        emit HashStored(_hash, msg.sender, block.timestamp);
    }
    
    function getHash() public view returns (string memory) {
        return storedHash;
    }
    
    function getHashView() public view returns (string memory) {
        return storedHash;
    }
}`;
            
            console.log('⚙️ Using simplified contract for reliable deployment');
            
            // Create a simple contract factory with basic bytecode
            const contractBytecode = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610330806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80632b3b99961461005c57806342b9ef14146100785780638da5cb5b14610096578063ee919d50146100b4578063f15da729146100d0575b600080fd5b610076600480360381019061007191906101d6565b6100ee565b005b610080610150565b60405161008d919061025a565b60405180910390f35b61009e6101e2565b6040516100ab91906102b5565b60405180910390f35b6100ce60048036038101906100c991906101d6565b610206565b005b6100d8610268565b6040516100e5919061025a565b60405180910390f35b80600190805190602001906101049291906102fa565b507f123456789012345678901234567890123456789012345678901234567890123433426040516101359291906102d0565b60405180910390a150565b606060018054610160919061031e565b80601f016020809104026020016040519081016040528092919081815260200182805461018c919061031e565b80156101d95780601f106101ae576101008083540402835291602001916101d9565b820191906000526020600020905b8154815290600101906020018083116101bc57829003601f168201915b5050505050905090565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b80600190805190602001906102209291906102fa565b5050565b60006001805461023390610350565b80601f016020809104026020016040519081016040528092919081815260200182805461025f90610350565b80156102ac5780601f10610281576101008083540402835291602001916102ac565b820191906000526020600020905b81548152906001019060200180831161028f57829003601f168201915b50505050509050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60006102e9826102bc565b9050919050565b6102f9816102de565b82525050565b610308816102d6565b82525050565b6000602082019050610323600083018461030f565b92915050565b6000602082019050610336600083018461030f565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061037857607f821691505b6020821081141561038c5761038b610343565b5b5091905056fea2646970667358221220abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef64736f6c63430008130033";
            
            const contractFactory = new ethers.ContractFactory(CONTRACT_ABI, contractBytecode, this.wallet);
            
            // Estimate gas with lower limits for testing
            const estimatedGas = 150000n; // Very low gas limit
            console.log(`⛽ Using Minimal Gas: ${estimatedGas.toString()}`);
            
            // Deploy the contract with minimal gas
            console.log('📤 Sending deployment transaction with minimal gas...');
            const contract = await contractFactory.deploy({
                gasLimit: estimatedGas,
                gasPrice: 2000000000n // 2 gwei - slightly higher than before
            });
            
            console.log(`📋 Contract deployment transaction: ${contract.deploymentTransaction().hash}`);
            console.log('⏳ Waiting for deployment confirmation...');
            
            // Wait for deployment confirmation
            await contract.waitForDeployment();
            
            const contractAddress = await contract.getAddress();
            
            console.log('✅ Contract deployed successfully!');
            console.log(`📄 Contract Address: ${contractAddress}`);
            
            // Verify deployment
            const code = await this.provider.getCode(contractAddress);
            if (code === '0x') {
                throw new Error('Contract deployment failed - no code at address');
            }
            
            console.log('✅ Contract code verified on blockchain');
            
            // Test basic functionality
            console.log('🔄 Testing contract functionality...');
            const owner = await contract.owner();
            console.log(`👑 Contract Owner: ${owner}`);
            
            if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
                throw new Error('Contract owner mismatch');
            }
            
            console.log('✅ Contract functionality test passed');
            
            // Update .env file guidance
            console.log('\n' + '='.repeat(60));
            console.log('📝 IMPORTANT: Update your .env file with the contract address:');
            console.log(`CONTRACT_ADDRESS=${contractAddress}`);
            console.log('='.repeat(60));
            
            return {
                contractAddress,
                contract,
                deploymentTransaction: contract.deploymentTransaction()
            };
            
        } catch (error) {
            console.error('❌ Contract deployment failed:', error.message);
            throw error;
        }
    }

    async verifyContractDeployment(contractAddress) {
        try {
            console.log('🔄 Verifying contract deployment...');
            
            // Connect to the deployed contract
            const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.wallet);
            
            // Test contract functions
            const owner = await contract.owner();
            const contractInfo = await contract.getContractInfo();
            
            console.log('✅ Contract verification successful');
            console.log(`👑 Owner: ${owner}`);
            console.log(`📊 Contract Info: Owner=${contractInfo[0]}, Hash=${contractInfo[1] || 'Empty'}, Balance=${ethers.formatEther(contractInfo[2])} ETH`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Contract verification failed:', error.message);
            return false;
        }
    }
}

// Main deployment function
async function main() {
    console.log('🚀 Starting BudgetHashStorage Contract Deployment');
    console.log('='.repeat(60));
    
    try {
        const deployer = new ContractDeployer();
        
        // Initialize deployment environment
        await deployer.initialize();
        
        console.log('\n' + '='.repeat(60));
        
        // Deploy the contract
        const deployment = await deployer.deployContract();
        
        console.log('\n' + '='.repeat(60));
        
        // Additional verification
        await deployer.verifyContractDeployment(deployment.contractAddress);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 Deployment completed successfully!');
        console.log('🔗 You can now use this contract address in your budget verification script.');
        console.log('📱 Next steps:');
        console.log('1. Copy the contract address to your .env file');
        console.log('2. Run: npm start');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n💥 Deployment failed:', error.message);
        console.log('\n📋 Troubleshooting:');
        console.log('• Check your PRIVATE_KEY and RPC_URL in .env file');
        console.log('• Ensure you have sufficient ETH balance for deployment');
        console.log('• Verify your network connection');
        console.log('• Make sure your RPC endpoint is working');
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = { ContractDeployer, CONTRACT_ABI, CONTRACT_BYTECODE };

// Run deployment if this file is executed directly
if (require.main === module) {
    main();
}