# Blockchain Budget Verifier

A comprehensive full-stack application that uses blockchain technology to verify the integrity of budget data. This system provides a React frontend, Express.js backend API, and smart contract integration for secure budget verification.

## 🎯 Features

- **Frontend Dashboard**: Modern React TypeScript interface with authentication
- **Backend API**: Express.js server with MongoDB and blockchain integration
- **Budget Data Hashing**: Convert budget data to JSON and create keccak256 hashes
- **Blockchain Storage**: Store hashes securely on Ethereum/Polygon testnets  
- **Integrity Verification**: Retrieve and compare hashes to detect tampering
- **Smart Contract Integration**: Deploy and interact with custom Solidity contracts
- **User Management**: JWT-based authentication with role-based access
- **File Upload**: Cloudinary integration for document management
- **Multiple Networks**: Support for Sepolia, Amoy, and other testnets

## 📁 Project Structure

```
blockchain-budget-verifier/
├── backend/                  # Backend API server
│   ├── config/              # Database and service configurations
│   ├── models/              # MongoDB schemas
│   ├── api-server.js        # Express.js API server
│   ├── index.js             # Core blockchain verification logic
│   ├── deploy.js            # Smart contract deployment
│   ├── BudgetHashStorage.sol # Solidity smart contract
│   ├── package.json         # Backend dependencies
│   ├── .env                 # Environment variables
│   └── README.md            # Backend documentation
├── frontend/                # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # API client and utilities
│   │   └── types/          # TypeScript definitions
│   ├── package.json        # Frontend dependencies
│   └── README.md           # Frontend documentation
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 16.0.0 or higher
- **MongoDB**: Atlas account or local installation
- **Testnet Account**: Ethereum or Polygon testnet account with test tokens
- **RPC Provider**: Infura, Alchemy, or other RPC service account

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd blockchain-budget-verifier
```

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment template
copy .env.example .env

# Edit .env with your actual values
notepad .env
```

### 3. Frontend Setup
```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install
```

### 4. Deploy Smart Contract
```bash
# From backend directory
npm run deploy
```

### 5. Start Development Servers

**Backend API Server:**
```bash
# From backend directory
npm run server
# Server runs on http://localhost:8080
```

**Frontend Development Server:**
```bash
# From frontend directory
npm run dev
# Frontend runs on http://localhost:5173
```

## 📊 How It Works

### 1. Budget Data Processing
```javascript
const budgetData = {
    project: "School Project X",
    amount: 1000000,
    department: "Science",
    submittedBy: "John Doe",
    submissionDate: "2024-01-15"
};
```

### 2. Hash Creation
- Converts budget data to JSON string
- Creates keccak256 hash (same as Ethereum)
- Generates unique fingerprint for the data

### 3. Blockchain Storage
- Connects to specified testnet
- Calls smart contract's `storeHash()` function
- Emits `HashStored` event for transparency

### 4. Verification Process
- Retrieves stored hash from blockchain
- Compares with original hash
- Returns ✅ **Verified** or ❌ **Tampered** result

## 🔧 Advanced Usage

### Custom Budget Data

Modify the budget data in `index.js`:

```javascript
const customBudgetData = {
    project: "Your Project Name",
    amount: 500000,
    department: "Your Department",
    // Add any additional fields
    category: "Research",
    priority: "High"
};

const verifier = new BudgetVerifier();
await verifier.verifyBudgetData(customBudgetData);
```

### Using Different Hash Algorithms

The system supports both keccak256 (default) and SHA256:

```javascript
// keccak256 (recommended for Ethereum compatibility)
const hash1 = verifier.createBudgetHash(budgetData);

// SHA256 alternative
const hash2 = verifier.createSHA256Hash(budgetData);
```

### Network Configuration

Support for multiple testnets:

```env
# Sepolia (Ethereum)
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
CHAIN_ID=11155111

# Mumbai (Polygon)
RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
CHAIN_ID=80001

# Goerli (Ethereum - deprecated but still usable)
RPC_URL=https://goerli.infura.io/v3/YOUR_PROJECT_ID
CHAIN_ID=5
```

## 🔒 Security Best Practices

### Private Key Management
- Never commit `.env` files to version control
- Use environment variables in production
- Consider hardware wallets for mainnet usage
- Rotate keys regularly

### Smart Contract Security
- The contract includes owner validation
- Hash length validation prevents empty submissions
- Events provide audit trails
- View functions don't require gas

### Network Security
- Use reputable RPC providers (Infura, Alchemy)
- Validate network chain IDs
- Monitor gas prices and limits

## 🛠️ Troubleshooting

### Common Issues

**"PRIVATE_KEY not found"**
```bash
# Check your .env file exists and has the correct variable name
echo $PRIVATE_KEY  # Linux/Mac
echo %PRIVATE_KEY% # Windows
```

**"Insufficient funds for intrinsic transaction cost"**
- Get more test ETH/MATIC from faucets
- Check your wallet balance
- Reduce gas limit if necessary

**"Contract not deployed"**
- Run deployment script: `npm run deploy`
- Update CONTRACT_ADDRESS in .env
- Verify contract on blockchain explorer

**"Network connection failed"**
- Check RPC_URL in .env
- Verify internet connection
- Try different RPC provider

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
```

This will show:
- Contract owner information
- Gas usage details
- Transaction receipts
- Event parsing results

## 📚 Smart Contract Details

### Contract Functions

```solidity
// Store a hash on blockchain
function storeHash(string memory _hash) public

// Retrieve stored hash (with event)
function getHash() public returns (string memory)

// Retrieve stored hash (view only)
function getHashView() public view returns (string memory)

// Verify hash matches stored hash
function verifyHash(string memory _hash) public view returns (bool)

// Get contract information
function getContractInfo() public view returns (address, string memory, uint256)
```

### Events

```solidity
// Emitted when hash is stored
event HashStored(string indexed hash, address indexed storer, uint256 timestamp);

// Emitted when hash is retrieved
event HashRetrieved(string hash, address indexed retriever, uint256 timestamp);
```

## 🧪 Testing

### Manual Testing

1. **Deploy Contract**: `npm run deploy`
2. **Store Hash**: `npm start`
3. **Modify Data**: Change budget data and run again
4. **Verify Results**: Should show "Tampered" for modified data

### Gas Usage

Typical gas usage:
- Contract Deployment: ~400,000 gas
- Store Hash: ~45,000 gas
- Retrieve Hash: ~25,000 gas

## 🌐 Supported Networks

| Network | Chain ID | Currency | Faucet |
|---------|----------|----------|---------|
| Sepolia | 11155111 | ETH | [sepoliafaucet.com](https://sepoliafaucet.com/) |
| Mumbai | 80001 | MATIC | [faucet.polygon.technology](https://faucet.polygon.technology/) |
| Goerli | 5 | ETH | [goerlifaucet.com](https://goerlifaucet.com/) |

## 📈 Future Enhancements

- [ ] Multi-signature wallet support
- [ ] Batch hash storage
- [ ] Hash history and versioning
- [ ] IPFS integration for large datasets
- [ ] Web interface for non-technical users
- [ ] Automated monitoring and alerts
- [ ] Integration with existing budget systems

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check troubleshooting section
- Review Ethereum/Polygon documentation

## 🙏 Acknowledgments

- **Ethers.js**: Ethereum library for JavaScript
- **OpenZeppelin**: Smart contract security patterns
- **Infura/Alchemy**: Reliable blockchain infrastructure
- **Ethereum Foundation**: Blockchain technology
- **Polygon**: Scaling solutions

---

**⚠️ Disclaimer**: This is for educational and testing purposes on testnets only. Always conduct thorough security audits before using on mainnet with real funds.