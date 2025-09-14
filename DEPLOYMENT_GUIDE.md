# Blockchain Budget Verifier - Deployment Guide

This guide provides step-by-step instructions for deploying the complete Blockchain Budget Verifier system.

## Prerequisites

Before deploying the system, ensure you have the following:

### System Requirements
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Ethereum wallet (MetaMask recommended)
- Infura/Alchemy account for RPC access
- Git (for cloning the repository)

### Development Tools
- Code editor (VS Code recommended)
- Terminal/Command Prompt
- Blockchain explorer access (Etherscan/Polygonscan)

## Architecture Overview

The system consists of three main components:

1. **Frontend** (React + TypeScript) - User interface
2. **Backend** (Node.js + Express) - API and business logic
3. **Blockchain** (Ethereum/Polygon) - Smart contracts and data storage

## Deployment Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd blockchain-budget-verifier
```

### 2. Backend Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment Variables
Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=8000
NODE_ENV=production

# Database Configuration
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d

# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
SEPOLIA_RPC_URL=your_sepolia_rpc_url
AMOY_RPC_URL=your_amoy_rpc_url
MUMBAI_RPC_URL=your_mumbai_rpc_url
POLYGON_RPC_URL=your_polygon_rpc_url

# Cloud Storage (Optional)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (Optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

#### Deploy Smart Contracts (Optional)
If you need to deploy your own smart contracts:

```bash
npm run blockchain:deploy
```

#### Start the Backend Server
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

### 3. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd ../frontend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment Variables
Create a `.env.production` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=https://your-backend-domain.com/api
VITE_BLOCKCHAIN_NETWORK=sepolia

# Blockchain Configuration
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_RPC_URL=your_rpc_url
```

#### Build the Frontend
```bash
npm run build
```

#### Serve the Frontend
You can serve the built files using any web server. For testing purposes:

```bash
npm run preview
```

### 4. Database Setup

#### MongoDB Configuration
Ensure MongoDB is running and accessible. The system will automatically create the necessary collections on first run.

#### Optional: Seed Database
To populate the database with sample data:

```bash
cd ../backend
npm run db:seed
```

### 5. Smart Contract Deployment

If you're deploying to a new network:

1. Update the contract in `backend/contracts/FundAllocationManager.sol`
2. Deploy using the deployment script:
   ```bash
   cd backend
   npm run blockchain:deploy
   ```
3. Update the CONTRACT_ADDRESS in your `.env` file with the deployed address

## Production Deployment

### Backend Deployment Options

#### Option 1: Traditional Server Deployment
1. Deploy to a cloud server (AWS EC2, DigitalOcean, etc.)
2. Set up NGINX as a reverse proxy
3. Configure SSL certificates
4. Set up process manager (PM2)

#### Option 2: Container Deployment
Create a Dockerfile for the backend:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t budget-backend .
docker run -p 8000:8000 budget-backend
```

#### Option 3: Cloud Platform Deployment
Deploy to platforms like:
- Heroku
- Vercel (for frontend)
- Render
- Railway

### Frontend Deployment Options

#### Option 1: Static Hosting
Build and deploy to static hosting services:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

#### Option 2: Traditional Server
Serve the built files using NGINX or Apache.

#### Option 3: Container Deployment
Create a Dockerfile for the frontend:

```dockerfile
FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Configuration

#### Production Environment (.env.production)
```env
NODE_ENV=production
PORT=8000
MONGO_URI=mongodb://production-db-url:27017/budgetverifier
JWT_SECRET=your_production_secret
PRIVATE_KEY=your_production_wallet_key
CONTRACT_ADDRESS=your_production_contract_address
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

#### Staging Environment (.env.staging)
```env
NODE_ENV=staging
PORT=8000
MONGO_URI=mongodb://staging-db-url:27017/budgetverifier
JWT_SECRET=your_staging_secret
PRIVATE_KEY=your_staging_wallet_key
CONTRACT_ADDRESS=your_staging_contract_address
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

## Security Considerations

### Backend Security
1. Use environment variables for sensitive data
2. Implement rate limiting
3. Use HTTPS in production
4. Regular security audits
5. Keep dependencies updated

### Frontend Security
1. Validate all user inputs
2. Implement proper authentication
3. Use Content Security Policy (CSP)
4. Sanitize user data before display

### Blockchain Security
1. Store private keys securely
2. Use multi-signature wallets for important operations
3. Implement proper access controls in smart contracts
4. Regularly audit smart contract code

## Monitoring and Maintenance

### Backend Monitoring
1. Set up logging with Winston
2. Implement health check endpoints
3. Monitor database performance
4. Set up error tracking (Sentry, etc.)

### Frontend Monitoring
1. Implement error boundaries
2. Track user interactions
3. Monitor performance metrics
4. Set up analytics

### Blockchain Monitoring
1. Monitor transaction confirmations
2. Track gas usage and costs
3. Monitor contract events
4. Set up alerts for important events

## Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify MongoDB is running
- Check connection string format
- Ensure firewall allows connections

#### Blockchain Connection Issues
- Verify RPC URL is correct
- Check network connectivity
- Ensure private key has sufficient funds

#### Authentication Issues
- Verify JWT secret matches between services
- Check token expiration settings
- Ensure proper CORS configuration

### Logs and Debugging

#### Backend Logs
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log
```

#### Frontend Debugging
- Use browser developer tools
- Check network tab for API calls
- Monitor console for errors

#### Blockchain Debugging
- Use blockchain explorer to verify transactions
- Check contract events
- Monitor gas usage

## Scaling Considerations

### Horizontal Scaling
1. Use load balancers for backend services
2. Implement database sharding for large datasets
3. Use CDN for frontend assets
4. Implement caching strategies

### Performance Optimization
1. Database indexing
2. API response caching
3. Frontend code splitting
4. Image optimization

## Backup and Recovery

### Database Backup
```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/budgetverifier" --out=/backup/path

# MongoDB restore
mongorestore --uri="mongodb://localhost:27017/budgetverifier" /backup/path
```

### Configuration Backup
- Regularly backup `.env` files
- Version control configuration files
- Document deployment procedures

## Support and Maintenance

### Regular Maintenance Tasks
1. Update dependencies
2. Monitor system performance
3. Review security logs
4. Backup databases
5. Test disaster recovery procedures

### Community Support
- GitHub issues for bug reports
- Documentation updates
- Community forums
- Regular security audits

## Conclusion

The Blockchain Budget Verifier system is designed for easy deployment and maintenance. By following this guide, you can have a complete financial transparency solution running in production.

The system provides:
- Complete end-to-end budget tracking
- Blockchain-based verification
- Real-time monitoring
- Role-based access control
- Comprehensive reporting

For any deployment issues or questions, refer to the documentation or reach out to the development team.