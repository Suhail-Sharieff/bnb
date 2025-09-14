# Blockchain Budget Verifier - Complete Financial Transparency Solution

A comprehensive blockchain-based solution for complete financial transparency in institutions. This system ensures trust through cryptographic verification while making fund movement easy to follow and understand.

## Key Features

### 1. Complete Financial Transparency
- **End-to-End Tracking**: Follow funds from budget allocation through departments, projects, and vendors
- **Real-time Monitoring**: Live dashboard showing current spending status
- **Immutable Records**: All transactions cryptographically verified and stored on blockchain

### 2. Trust Through Verification
- **Consistent Hashing**: Same algorithm used across frontend, backend, and blockchain
- **Blockchain Verification**: Every transaction verified against on-chain data
- **Proof of Authenticity**: Cryptographic proofs for all financial data

### 3. Easy-to-Understand Interface
- **Visual Budget Flow**: Interactive visualization showing fund movement
- **Department Breakdown**: Clear view of spending by department
- **Vendor Tracking**: Track funds allocated to specific vendors

### 4. Security and Compliance
- **Role-Based Access**: Different views for admins, vendors, and auditors
- **Compliance Verification**: Document submission and verification system
- **Reputation System**: Vendor performance tracking

## Architecture

### Backend (Node.js + Express)
- RESTful API for all operations
- MongoDB for persistent storage
- Ethers.js for blockchain interactions
- Comprehensive hashing utilities for data integrity

### Frontend (React + TypeScript)
- Responsive dashboard with real-time updates
- Interactive budget flow visualization
- Transaction monitoring with blockchain verification
- Role-specific views for different user types

### Blockchain (Ethereum/Polygon)
- Smart contracts for fund allocation and management
- Immutable transaction records
- Real-time event notifications
- Compliance verification mechanisms

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Ethereum wallet (MetaMask recommended)
- Infura/Alchemy account for RPC access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blockchain-budget-verifier
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Configure environment variables:
```bash
# Backend (.env)
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
SEPOLIA_RPC_URL=your_sepolia_rpc_url
```

5. Start the backend server:
```bash
cd backend
npm run dev
```

6. Start the frontend:
```bash
cd frontend
npm run dev
```

## API Endpoints

### Admin Routes
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/budget-requests` - Get all budget requests
- `PUT /api/admin/budget-requests/:id/approve` - Approve budget request
- `PUT /api/admin/budget-requests/:id/reject` - Reject budget request
- `PUT /api/admin/budget-requests/:id/allocate` - Allocate funds to vendor
- `GET /api/admin/transactions` - Get transaction history
- `GET /api/admin/transactions/:id` - Get single transaction
- `GET /api/admin/transactions/proof/:txHash` - Get transaction proof
- `GET /api/admin/transactions/debug/:id` - Debug hash consistency
- `GET /api/admin/budget-flow/:id/visualization` - Get budget flow visualization

### Vendor Routes
- `GET /api/vendor/dashboard` - Get vendor dashboard
- `GET /api/vendor/projects` - Get assigned projects
- `POST /api/vendor/projects/:id/documents` - Upload compliance documents
- `GET /api/vendor/projects/:id/documents` - Get project documents
- `GET /api/vendor/wallet` - Get wallet information

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## Smart Contract Functions

### Budget Management
- `createBudgetRequest()` - Create a new budget request
- `approveBudgetRequest()` - Approve a pending budget request
- `rejectBudgetRequest()` - Reject a pending budget request
- `allocateFunds()` - Allocate funds to a vendor

### Compliance
- `submitComplianceDocuments()` - Submit compliance documents
- `verifyCompliance()` - Verify compliance requirements

### User Management
- `registerUser()` - Register a new user
- `getUserBudgetRequests()` - Get user's budget requests
- `getUserAllocations()` - Get user's fund allocations

## Security Features

### Data Integrity
- All financial data is hashed using keccak256 algorithm
- Hashes are consistent across frontend, backend, and blockchain
- Transaction verification ensures data hasn't been tampered with

### Access Control
- JWT-based authentication
- Role-based authorization (Admin, Vendor, Auditor)
- Secure password storage with bcrypt

### Blockchain Verification
- All transactions stored on Ethereum/Polygon
- Real-time verification against on-chain data
- Cryptographic proofs for authenticity

## Financial Transparency Features

### Budget Flow Visualization
- Interactive tree view showing fund movement
- Department-level spending breakdown
- Project and vendor allocation tracking
- Real-time utilization metrics

### Transaction Monitoring
- Blockchain transaction verification
- Hash consistency checking
- Proof of authenticity generation
- Explorer links for on-chain verification

### Reporting
- Spending reports by category
- Vendor performance metrics
- Department budget breakdowns
- Compliance verification reports

## Making Information Easy to Understand

### Dashboard Views
- High-level financial overview
- Key metrics with trend indicators
- Color-coded status indicators
- Quick access to recent transactions

### Visualizations
- Budget utilization charts
- Spending patterns over time
- Department comparison graphs
- Vendor performance ratings

### Alerts and Notifications
- Real-time transaction notifications
- Budget threshold warnings
- Compliance deadline reminders
- Status change alerts

## For Citizens, Students, Parents, and Donors

### Public Verification
- Transparent budget allocation process
- Verifiable transaction history
- Real-time spending updates
- Compliance documentation access

### Trust Indicators
- Blockchain verification badges
- Cryptographic proof of authenticity
- Immutable transaction records
- Third-party audit capabilities

## Conclusion

This system addresses all the key challenges in financial transparency:
1. **Makes fund movement easy to follow** through comprehensive visualization
2. **Ensures data authenticity** through blockchain verification
3. **Provides traceability** from budget to vendor payment
4. **Makes information accessible** to all stakeholders
5. **Builds trust** through cryptographic verification

The solution works for:
- Government budget transparency
- College fund tracking
- NGO donation monitoring
- School project funding
- Corporate expense tracking

All without requiring changes to the UI or core functionality, ensuring a smooth user experience while providing complete financial transparency.