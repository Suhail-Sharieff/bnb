// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FundAllocationManager
 * @dev Advanced smart contract for complete fund allocation and management
 */
contract FundAllocationManager {
    
    // Enums for budget states
    enum BudgetState { PENDING, APPROVED, REJECTED, ALLOCATED, COMPLETED, CANCELLED }
    enum TransactionType { ALLOCATION, WITHDRAWAL, REALLOCATION, COMPLIANCE_RELEASE }
    enum UserRole { ADMIN, VENDOR, AUDITOR }
    
    // Structs
    struct BudgetRequest {
        uint256 id;
        address requester;
        string department;
        string project;
        uint256 amount;
        string description;
        BudgetState state;
        uint256 timestamp;
        string documentsHash;
        address approvedBy;
        uint256 approvedAt;
    }
    
    struct FundAllocation {
        uint256 id;
        uint256 budgetRequestId;
        address vendor;
        uint256 allocatedAmount;
        uint256 releasedAmount;
        string complianceRequirements;
        bool complianceMet;
        uint256 allocationTimestamp;
        uint256 releaseTimestamp;
        string[] documentHashes;
    }
    
    struct Transaction {
        uint256 id;
        TransactionType txType;
        address from;
        address to;
        uint256 amount;
        string description;
        uint256 timestamp;
        string blockchainProof;
        bool isReversible;
    }
    
    struct UserProfile {
        address userAddress;
        UserRole role;
        string name;
        string email;
        bool isActive;
        uint256 totalAllocated;
        uint256 totalWithdrawn;
        uint256 reputationScore;
        uint256 joinedAt;
    }
    
    // State variables
    mapping(uint256 => BudgetRequest) public budgetRequests;
    mapping(uint256 => FundAllocation) public fundAllocations;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => uint256[]) public userBudgetRequests;
    mapping(address => uint256[]) public userAllocations;
    mapping(string => uint256) public departmentBudgets;
    mapping(string => uint256) public projectBudgets;
    
    uint256 public budgetRequestCounter;
    uint256 public allocationCounter;
    uint256 public transactionCounter;
    uint256 public totalFunds;
    uint256 public allocatedFunds;
    uint256 public releasedFunds;
    
    address public owner;
    address[] public admins;
    address[] public vendors;
    
    // Events for real-time notifications
    event BudgetRequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, string department);
    event BudgetStateChanged(uint256 indexed requestId, BudgetState oldState, BudgetState newState, address changedBy);
    event FundsAllocated(uint256 indexed allocationId, uint256 indexed requestId, address indexed vendor, uint256 amount);
    event FundsReleased(uint256 indexed allocationId, address indexed vendor, uint256 amount, string reason);
    event ComplianceVerified(uint256 indexed allocationId, address indexed vendor, string[] documentHashes);
    event TransactionRecorded(uint256 indexed txId, TransactionType txType, address indexed from, address indexed to, uint256 amount);
    event UserRegistered(address indexed user, UserRole role, string name);
    event ReputationUpdated(address indexed user, uint256 oldScore, uint256 newScore);
    event EmergencyWithdrawal(uint256 indexed allocationId, address indexed admin, uint256 amount, string reason);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAdmin() {
        require(userProfiles[msg.sender].role == UserRole.ADMIN, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVendor() {
        require(userProfiles[msg.sender].role == UserRole.VENDOR, "Only vendor can perform this action");
        _;
    }
    
    modifier onlyActiveUser() {
        require(userProfiles[msg.sender].isActive, "User account is not active");
        _;
    }
    
    modifier validBudgetRequest(uint256 _requestId) {
        require(_requestId > 0 && _requestId <= budgetRequestCounter, "Invalid budget request ID");
        _;
    }
    
    modifier validAllocation(uint256 _allocationId) {
        require(_allocationId > 0 && _allocationId <= allocationCounter, "Invalid allocation ID");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Register owner as first admin
        userProfiles[msg.sender] = UserProfile({
            userAddress: msg.sender,
            role: UserRole.ADMIN,
            name: "System Administrator",
            email: "admin@system.com",
            isActive: true,
            totalAllocated: 0,
            totalWithdrawn: 0,
            reputationScore: 100,
            joinedAt: block.timestamp
        });
        
        admins.push(msg.sender);
        emit UserRegistered(msg.sender, UserRole.ADMIN, "System Administrator");
    }
    
    // User Management Functions
    function registerUser(
        address _userAddress,
        UserRole _role,
        string memory _name,
        string memory _email
    ) external onlyAdmin {
        require(!userProfiles[_userAddress].isActive, "User already registered");
        
        userProfiles[_userAddress] = UserProfile({
            userAddress: _userAddress,
            role: _role,
            name: _name,
            email: _email,
            isActive: true,
            totalAllocated: 0,
            totalWithdrawn: 0,
            reputationScore: 50, // Starting reputation
            joinedAt: block.timestamp
        });
        
        if (_role == UserRole.ADMIN) {
            admins.push(_userAddress);
        } else if (_role == UserRole.VENDOR) {
            vendors.push(_userAddress);
        }
        
        emit UserRegistered(_userAddress, _role, _name);
    }
    
    // Budget Request Functions
    function createBudgetRequest(
        string memory _department,
        string memory _project,
        uint256 _amount,
        string memory _description,
        string memory _documentsHash
    ) external onlyActiveUser {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_department).length > 0, "Department cannot be empty");
        require(bytes(_project).length > 0, "Project cannot be empty");
        
        budgetRequestCounter++;
        
        budgetRequests[budgetRequestCounter] = BudgetRequest({
            id: budgetRequestCounter,
            requester: msg.sender,
            department: _department,
            project: _project,
            amount: _amount,
            description: _description,
            state: BudgetState.PENDING,
            timestamp: block.timestamp,
            documentsHash: _documentsHash,
            approvedBy: address(0),
            approvedAt: 0
        });
        
        userBudgetRequests[msg.sender].push(budgetRequestCounter);
        
        emit BudgetRequestCreated(budgetRequestCounter, msg.sender, _amount, _department);
    }
    
    function approveBudgetRequest(uint256 _requestId) external onlyAdmin validBudgetRequest(_requestId) {
        BudgetRequest storage request = budgetRequests[_requestId];
        require(request.state == BudgetState.PENDING, "Request is not pending");
        
        BudgetState oldState = request.state;
        request.state = BudgetState.APPROVED;
        request.approvedBy = msg.sender;
        request.approvedAt = block.timestamp;
        
        // Update department and project budgets
        departmentBudgets[request.department] += request.amount;
        projectBudgets[request.project] += request.amount;
        
        emit BudgetStateChanged(_requestId, oldState, BudgetState.APPROVED, msg.sender);
    }
    
    function rejectBudgetRequest(uint256 _requestId, string memory _reason) external onlyAdmin validBudgetRequest(_requestId) {
        BudgetRequest storage request = budgetRequests[_requestId];
        require(request.state == BudgetState.PENDING, "Request is not pending");
        
        BudgetState oldState = request.state;
        request.state = BudgetState.REJECTED;
        request.approvedBy = msg.sender;
        request.approvedAt = block.timestamp;
        
        // Record rejection transaction
        _recordTransaction(TransactionType.ALLOCATION, msg.sender, request.requester, 0, string(abi.encodePacked("Rejected: ", _reason)));
        
        emit BudgetStateChanged(_requestId, oldState, BudgetState.REJECTED, msg.sender);
    }
    
    // Fund Allocation Functions
    function allocateFunds(
        uint256 _requestId,
        address _vendor,
        string memory _complianceRequirements
    ) external onlyAdmin validBudgetRequest(_requestId) {
        BudgetRequest storage request = budgetRequests[_requestId];
        require(request.state == BudgetState.APPROVED, "Request must be approved first");
        require(userProfiles[_vendor].role == UserRole.VENDOR, "Invalid vendor address");
        require(userProfiles[_vendor].isActive, "Vendor account is not active");
        
        allocationCounter++;
        
        fundAllocations[allocationCounter] = FundAllocation({
            id: allocationCounter,
            budgetRequestId: _requestId,
            vendor: _vendor,
            allocatedAmount: request.amount,
            releasedAmount: 0,
            complianceRequirements: _complianceRequirements,
            complianceMet: false,
            allocationTimestamp: block.timestamp,
            releaseTimestamp: 0,
            documentHashes: new string[](0)
        });
        
        userAllocations[_vendor].push(allocationCounter);
        userProfiles[_vendor].totalAllocated += request.amount;
        
        // Update request state
        request.state = BudgetState.ALLOCATED;
        allocatedFunds += request.amount;
        
        // Record transaction
        _recordTransaction(TransactionType.ALLOCATION, msg.sender, _vendor, request.amount, "Fund allocation");
        
        emit FundsAllocated(allocationCounter, _requestId, _vendor, request.amount);
        emit BudgetStateChanged(_requestId, BudgetState.APPROVED, BudgetState.ALLOCATED, msg.sender);
    }
    
    // Compliance and Document Management
    function submitComplianceDocuments(
        uint256 _allocationId,
        string[] memory _documentHashes
    ) external onlyVendor validAllocation(_allocationId) {
        FundAllocation storage allocation = fundAllocations[_allocationId];
        require(allocation.vendor == msg.sender, "Not authorized for this allocation");
        require(_documentHashes.length > 0, "At least one document required");
        
        // Add documents to allocation
        for (uint i = 0; i < _documentHashes.length; i++) {
            allocation.documentHashes.push(_documentHashes[i]);
        }
        
        emit ComplianceVerified(_allocationId, msg.sender, _documentHashes);
    }
    
    function verifyCompliance(uint256 _allocationId) external onlyAdmin validAllocation(_allocationId) {
        FundAllocation storage allocation = fundAllocations[_allocationId];
        require(allocation.documentHashes.length > 0, "No documents submitted");
        require(!allocation.complianceMet, "Compliance already verified");
        
        allocation.complianceMet = true;
        
        // Auto-release funds if compliance is met
        _releaseFunds(_allocationId, "Compliance verification passed");
    }
    
    // Fund Release Functions
    function _releaseFunds(uint256 _allocationId, string memory _reason) internal {
        FundAllocation storage allocation = fundAllocations[_allocationId];
        require(allocation.complianceMet, "Compliance not met");
        require(allocation.releasedAmount == 0, "Funds already released");
        
        allocation.releasedAmount = allocation.allocatedAmount;
        allocation.releaseTimestamp = block.timestamp;
        releasedFunds += allocation.allocatedAmount;
        
        userProfiles[allocation.vendor].totalWithdrawn += allocation.allocatedAmount;
        
        // Update reputation score
        _updateReputationScore(allocation.vendor, 10); // Bonus for successful completion
        
        // Record transaction
        _recordTransaction(TransactionType.COMPLIANCE_RELEASE, address(this), allocation.vendor, allocation.allocatedAmount, _reason);
        
        emit FundsReleased(_allocationId, allocation.vendor, allocation.allocatedAmount, _reason);
    }
    
    function emergencyWithdraw(uint256 _allocationId, string memory _reason) external onlyAdmin validAllocation(_allocationId) {
        FundAllocation storage allocation = fundAllocations[_allocationId];
        require(allocation.releasedAmount == 0, "Funds already released");
        
        uint256 amountToWithdraw = allocation.allocatedAmount;
        allocation.allocatedAmount = 0;
        allocatedFunds -= amountToWithdraw;
        
        // Penalize vendor reputation
        _updateReputationScore(allocation.vendor, -20);
        
        // Record transaction
        _recordTransaction(TransactionType.WITHDRAWAL, allocation.vendor, msg.sender, amountToWithdraw, _reason);
        
        emit EmergencyWithdrawal(_allocationId, msg.sender, amountToWithdraw, _reason);
    }
    
    // Internal helper functions
    function _recordTransaction(
        TransactionType _type,
        address _from,
        address _to,
        uint256 _amount,
        string memory _description
    ) internal {
        transactionCounter++;
        
        transactions[transactionCounter] = Transaction({
            id: transactionCounter,
            txType: _type,
            from: _from,
            to: _to,
            amount: _amount,
            description: _description,
            timestamp: block.timestamp,
            blockchainProof: string(abi.encodePacked("Block: ", _uint2str(block.number), " TX: ", transactionCounter)),
            isReversible: _type != TransactionType.COMPLIANCE_RELEASE
        });
        
        emit TransactionRecorded(transactionCounter, _type, _from, _to, _amount);
    }
    
    function _updateReputationScore(address _user, int256 _change) internal {
        UserProfile storage profile = userProfiles[_user];
        uint256 oldScore = profile.reputationScore;
        
        if (_change > 0) {
            profile.reputationScore += uint256(_change);
            if (profile.reputationScore > 100) {
                profile.reputationScore = 100;
            }
        } else {
            uint256 decrease = uint256(-_change);
            if (profile.reputationScore > decrease) {
                profile.reputationScore -= decrease;
            } else {
                profile.reputationScore = 0;
            }
        }
        
        emit ReputationUpdated(_user, oldScore, profile.reputationScore);
    }
    
    // View functions for dashboard and reporting
    function getBudgetRequest(uint256 _requestId) external view validBudgetRequest(_requestId) returns (
        uint256 id,
        address requester,
        string memory department,
        string memory project,
        uint256 amount,
        string memory description,
        BudgetState state,
        uint256 timestamp,
        address approvedBy,
        uint256 approvedAt
    ) {
        BudgetRequest storage request = budgetRequests[_requestId];
        return (
            request.id,
            request.requester,
            request.department,
            request.project,
            request.amount,
            request.description,
            request.state,
            request.timestamp,
            request.approvedBy,
            request.approvedAt
        );
    }
    
    function getAllocation(uint256 _allocationId) external view validAllocation(_allocationId) returns (
        uint256 id,
        uint256 budgetRequestId,
        address vendor,
        uint256 allocatedAmount,
        uint256 releasedAmount,
        bool complianceMet,
        uint256 allocationTimestamp,
        uint256 releaseTimestamp
    ) {
        FundAllocation storage allocation = fundAllocations[_allocationId];
        return (
            allocation.id,
            allocation.budgetRequestId,
            allocation.vendor,
            allocation.allocatedAmount,
            allocation.releasedAmount,
            allocation.complianceMet,
            allocation.allocationTimestamp,
            allocation.releaseTimestamp
        );
    }
    
    function getUserBudgetRequests(address _user) external view returns (uint256[] memory) {
        return userBudgetRequests[_user];
    }
    
    function getUserAllocations(address _user) external view returns (uint256[] memory) {
        return userAllocations[_user];
    }
    
    function getDashboardStats() external view returns (
        uint256 totalBudgetRequests,
        uint256 totalAllocations,
        uint256 totalTransactions,
        uint256 totalFundsAmount,
        uint256 allocatedFundsAmount,
        uint256 releasedFundsAmount,
        uint256 activeVendors,
        uint256 activeAdmins
    ) {
        return (
            budgetRequestCounter,
            allocationCounter,
            transactionCounter,
            totalFunds,
            allocatedFunds,
            releasedFunds,
            vendors.length,
            admins.length
        );
    }
    
    function getTransactionHistory(uint256 _limit, uint256 _offset) external view returns (
        uint256[] memory ids,
        TransactionType[] memory types,
        address[] memory froms,
        address[] memory tos,
        uint256[] memory amounts,
        uint256[] memory timestamps
    ) {
        uint256 end = transactionCounter;
        uint256 start = _offset;
        uint256 length = _limit;
        
        if (start >= end) {
            return (new uint256[](0), new TransactionType[](0), new address[](0), new address[](0), new uint256[](0), new uint256[](0));
        }
        
        if (start + length > end) {
            length = end - start;
        }
        
        ids = new uint256[](length);
        types = new TransactionType[](length);
        froms = new address[](length);
        tos = new address[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            Transaction storage tx = transactions[end - start - i];
            ids[i] = tx.id;
            types[i] = tx.txType;
            froms[i] = tx.from;
            tos[i] = tx.to;
            amounts[i] = tx.amount;
            timestamps[i] = tx.timestamp;
        }
    }
    
    // Utility functions
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // Emergency functions
    function pause() external onlyOwner {
        // Emergency pause functionality
    }
    
    function unpause() external onlyOwner {
        // Emergency unpause functionality
    }
}