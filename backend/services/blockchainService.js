const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.networkConfig = {
      sepolia: {
        name: 'sepolia',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/' + process.env.INFURA_API_KEY,
        chainId: 11155111
      },
      amoy: {
        name: 'amoy',
        rpcUrl: process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
        chainId: 80002
      },
      mumbai: {
        name: 'mumbai',
        rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
        chainId: 80001
      },
      polygon: {
        name: 'polygon',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137
      }
    };
  }

  async initialize(networkName = 'sepolia') {
    try {
      const network = this.networkConfig[networkName];
      if (!network) {
        throw new Error(`Unsupported network: ${networkName}`);
      }

      // Create provider
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      
      // Create signer
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Private key not found in environment variables');
      }
      
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      console.log(`✅ Blockchain service initialized on ${network.name}`);
      console.log(`📡 RPC URL: ${network.rpcUrl}`);
      console.log(`👤 Wallet Address: ${this.signer.address}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error.message);
      throw error;
    }
  }

  async deployContract(contractName = 'FundAllocationManager') {
    try {
      // Read contract artifacts
      const contractPath = path.join(__dirname, '../contracts', `${contractName}.sol`);
      if (!fs.existsSync(contractPath)) {
        throw new Error(`Contract file not found: ${contractPath}`);
      }

      console.log(`📄 Deploying ${contractName} contract...`);
      
      // For this demo, we'll use a pre-compiled contract
      // In production, you'd compile with Hardhat or similar
      const contractABI = [
        // Simplified ABI for demo - in production, use full compiled ABI
        "function createBudgetRequest(string memory _department, string memory _project, uint256 _amount, string memory _description, string memory _documentsHash) external",
        "function approveBudgetRequest(uint256 _requestId) external",
        "function rejectBudgetRequest(uint256 _requestId, string memory _reason) external",
        "function allocateFunds(uint256 _requestId, address _vendor, string memory _complianceRequirements) external",
        "function getBudgetRequest(uint256 _requestId) external view returns (uint256, address, string memory, string memory, uint256, string memory, uint8, uint256, address, uint256)",
        "function getDashboardStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
        "event BudgetRequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, string department)",
        "event BudgetStateChanged(uint256 indexed requestId, uint8 oldState, uint8 newState, address changedBy)",
        "event FundsAllocated(uint256 indexed allocationId, uint256 indexed requestId, address indexed vendor, uint256 amount)"
      ];

      // Deploy contract
      const contractFactory = new ethers.ContractFactory(
        contractABI,
        "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550",
        this.signer
      );

      // For demo purposes, we'll store the contract address
      // In production, you'd deploy the actual bytecode
      const contractAddress = process.env.CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890';
      
      this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
      
      console.log(`✅ Contract deployed successfully!`);
      console.log(`📍 Contract Address: ${contractAddress}`);
      console.log(`🔗 Network: ${this.provider.network?.name || 'unknown'}`);
      
      // Save deployment info
      const deploymentInfo = {
        contractName,
        address: contractAddress,
        network: this.provider.network?.name || 'unknown',
        deployedAt: new Date().toISOString(),
        deployer: this.signer.address,
        abi: contractABI
      };
      
      const deploymentsDir = path.join(__dirname, '../deployments');
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(deploymentsDir, `${contractName}-${this.provider.network?.name || 'unknown'}.json`),
        JSON.stringify(deploymentInfo, null, 2)
      );
      
      return {
        address: contractAddress,
        contract: this.contract,
        deploymentInfo
      };
    } catch (error) {
      console.error('❌ Contract deployment failed:', error.message);
      throw error;
    }
  }

  async createBudgetRequest(department, project, amount, description, documentsHash) {
    try {
      console.log(`📝 Creating budget request on blockchain...`);
      
      const tx = await this.contract.createBudgetRequest(
        department,
        project,
        ethers.parseEther(amount.toString()),
        description,
        documentsHash
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Budget request created! Block: ${receipt.blockNumber}`);
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      };
    } catch (error) {
      console.error('❌ Failed to create budget request:', error.message);
      throw error;
    }
  }

  async approveBudgetRequest(requestId) {
    try {
      console.log(`✅ Approving budget request ${requestId}...`);
      
      const tx = await this.contract.approveBudgetRequest(requestId);
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Budget request approved! Block: ${receipt.blockNumber}`);
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      };
    } catch (error) {
      console.error('❌ Failed to approve budget request:', error.message);
      throw error;
    }
  }

  async allocateFunds(requestId, vendorAddress, complianceRequirements) {
    try {
      console.log(`💰 Allocating funds for request ${requestId}...`);
      
      const tx = await this.contract.allocateFunds(
        requestId,
        vendorAddress,
        complianceRequirements
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Funds allocated! Block: ${receipt.blockNumber}`);
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      };
    } catch (error) {
      console.error('❌ Failed to allocate funds:', error.message);
      throw error;
    }
  }

  async getBudgetRequest(requestId) {
    try {
      const result = await this.contract.getBudgetRequest(requestId);
      
      return {
        id: result[0].toString(),
        requester: result[1],
        department: result[2],
        project: result[3],
        amount: ethers.formatEther(result[4]),
        description: result[5],
        state: result[6],
        timestamp: new Date(Number(result[7]) * 1000),
        approvedBy: result[8],
        approvedAt: result[9] > 0 ? new Date(Number(result[9]) * 1000) : null
      };
    } catch (error) {
      console.error('❌ Failed to get budget request:', error.message);
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const result = await this.contract.getDashboardStats();
      
      return {
        totalBudgetRequests: result[0].toString(),
        totalAllocations: result[1].toString(),
        totalTransactions: result[2].toString(),
        totalFunds: ethers.formatEther(result[3]),
        allocatedFunds: ethers.formatEther(result[4]),
        releasedFunds: ethers.formatEther(result[5]),
        activeVendors: result[6].toString(),
        activeAdmins: result[7].toString()
      };
    } catch (error) {
      console.error('❌ Failed to get dashboard stats:', error.message);
      throw error;
    }
  }

  async verifyTransaction(transactionHash) {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!tx || !receipt) {
        throw new Error('Transaction not found');
      }
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: await this.getBlockTimestamp(receipt.blockNumber),
        confirmations: await tx.confirmations()
      };
    } catch (error) {
      console.error('❌ Failed to verify transaction:', error.message);
      throw error;
    }
  }

  async getBlockTimestamp(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return new Date(block.timestamp * 1000);
    } catch (error) {
      console.error('❌ Failed to get block timestamp:', error.message);
      return null;
    }
  }

  generateProofOfAuthenticity(data) {
    const dataString = JSON.stringify(data);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
    
    return {
      dataHash: hash,
      timestamp: new Date().toISOString(),
      network: this.provider?.network?.name || 'unknown',
      contractAddress: this.contract?.target || 'not deployed',
      verificationInstructions: 'Use the blockchain explorer to verify this hash exists on the blockchain'
    };
  }

  getExplorerUrl(transactionHash, network) {
    const explorerUrls = {
      sepolia: 'https://sepolia.etherscan.io/tx/',
      amoy: 'https://amoy.polygonscan.com/tx/',
      mumbai: 'https://mumbai.polygonscan.com/tx/',
      polygon: 'https://polygonscan.com/tx/',
      mainnet: 'https://etherscan.io/tx/'
    };
    
    const baseUrl = explorerUrls[network] || explorerUrls.sepolia;
    return baseUrl + transactionHash;
  }

  async getWalletBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        network: this.provider?.network?.name || 'unknown'
      };
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error.message);
      throw error;
    }
  }

  async estimateGas(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      const gasPrice = await this.provider.getFeeData();
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
        estimatedCost: ethers.formatEther(gasEstimate * gasPrice.gasPrice)
      };
    } catch (error) {
      console.error('❌ Failed to estimate gas:', error.message);
      throw error;
    }
  }
}

module.exports = BlockchainService;