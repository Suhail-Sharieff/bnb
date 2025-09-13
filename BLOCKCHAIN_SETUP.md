# Blockchain Configuration Guide

This document provides step-by-step instructions for configuring the blockchain features in your budget verification system.

## 🔧 Environment Setup

### 1. Backend Configuration (.env)

Copy the `.env.example` file and configure the following variables:

```env
# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
CONTRACT_ADDRESS=your_deployed_contract_address
NETWORK_NAME=sepolia
CHAIN_ID=11155111
DEBUG=true

# API Server Configuration
PORT=3000
CORS_ORIGIN=*

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Supported Networks

| Network | Chain ID | RPC URL Template | Explorer |
|---------|----------|------------------|----------|
| Sepolia | 11155111 | `https://sepolia.infura.io/v3/PROJECT_ID` | https://sepolia.etherscan.io/ |
| Polygon Amoy | 80002 | `https://polygon-amoy.infura.io/v3/PROJECT_ID` | https://amoy.polygonscan.com/ |

### 3. Getting Test Tokens

**For Sepolia:**
- Visit: https://sepoliafaucet.com/
- Enter your wallet address
- Request test ETH

**For Polygon Amoy:**
- Visit: https://faucet.polygon.technology/
- Select "Polygon Amoy" network
- Enter your wallet address
- Request test MATIC

## 🚀 Deployment Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
copy .env.example .env
# Edit with your actual values
notepad .env
```

### 3. Deploy Smart Contract
```bash
npm run deploy
```

### 4. Start Backend Server
```bash
npm run server
```

### 5. Start Frontend (separate terminal)
```bash
cd ../frontend
npm install
npm run dev
```

## 🔍 Verification

### 1. Check Wallet Balance
```bash
cd backend
node -e "const ethers = require('ethers'); require('dotenv').config(); async function check() { const provider = new ethers.JsonRpcProvider(process.env.RPC_URL); const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider); const balance = await provider.getBalance(wallet.address); console.log('Balance:', ethers.formatEther(balance), 'ETH'); } check();"
```

### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Wallet balance
curl http://localhost:3000/balance

# API documentation
curl http://localhost:3000/api/docs
```

### 3. Test Budget Verification
```bash
curl -X POST http://localhost:3000/api/budget/verify \
  -H "Content-Type: application/json" \
  -d '{
    "project": "Test Project",
    "amount": 1000,
    "department": "IT",
    "submittedBy": "Test User",
    "submissionDate": "2024-01-15",
    "approvalStatus": "Pending"
  }'
```

## 🛠️ Troubleshooting

### Common Issues

**"Blockchain features disabled"**
- Check PRIVATE_KEY is set in .env
- Verify wallet has sufficient balance
- Ensure RPC_URL is correct

**"Failed to fetch"**
- Verify backend is running on correct port
- Check frontend API_BASE_URL matches backend port
- Ensure CORS is properly configured

**"Insufficient funds"**
- Get test tokens from appropriate faucet
- Verify you're using the correct network
- Check minimum balance requirements (0.01 ETH)

### Debug Mode

Set `DEBUG=true` in .env for detailed logging:
- Transaction details
- Gas usage information
- Smart contract interaction logs
- API request/response logging

## 📚 Additional Resources

- [Ethers.js Documentation](https://docs.ethers.org/)
- [Sepolia Testnet Info](https://sepolia.dev/)
- [Polygon Amoy Documentation](https://docs.polygon.technology/amoy/)
- [Infura Setup Guide](https://docs.infura.io/)