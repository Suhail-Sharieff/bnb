// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AdvancedFundAllocationManager
 * @dev Smart contract for managing budget allocations, automatic fund release, and reallocation
 * @author Financial Transparency Platform
 */
contract AdvancedFundAllocationManager is ReentrancyGuard, AccessControl, Pausable {
    using Counters for Counters.Counter;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VENDOR_ROLE = keccak256("VENDOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // Counters
    Counters.Counter private _allocationIds;
    Counters.Counter private _transactionIds;
    
    // Enums
    enum AllocationStatus { ALLOCATED, PARTIALLY_RELEASED, FULLY_RELEASED, FROZEN, CANCELLED }
    enum TransactionType { ALLOCATION, RELEASE, WITHDRAWAL, REALLOCATION, FREEZE, UNFREEZE }
    enum DocumentStatus { PENDING, APPROVED, REJECTED }
    
    // Structs
    struct FundAllocation {
        uint256 allocationId;
        address vendor;
        address allocatedBy;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 frozenAmount;
        AllocationStatus status;
        string projectId;
        uint256 createdAt;
        uint256 updatedAt;
        bool autoReleaseEnabled;
        mapping(uint256 => Milestone) milestones;
        uint256 milestoneCount;
        mapping(uint256 => Document) documents;
        uint256 documentCount;
    }
    
    struct Milestone {
        uint256 amount;
        uint256 dueDate;
        bool isReleased;
        uint256 releasedAt;
        string description;
        bool autoRelease;
    }
    
    struct Document {
        string hash;
        string documentType;
        DocumentStatus status;
        uint256 uploadedAt;
        uint256 reviewedAt;
        address reviewedBy;
        string comments;
    }
    
    struct Transaction {
        uint256 transactionId;
        uint256 allocationId;
        TransactionType transactionType;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string description;
        bytes32 dataHash;
    }
    
    struct VendorWallet {
        address walletAddress;
        uint256 totalAllocated;
        uint256 totalReleased;
        uint256 totalWithdrawn;
        uint256 frozenAmount;
        bool isActive;
        uint256 reputationScore;
        uint256 lastActivityAt;
    }
    
    // State variables
    mapping(uint256 => FundAllocation) public allocations;
    mapping(address => VendorWallet) public vendorWallets;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public vendorAllocations;
    mapping(string => uint256) public projectAllocations;
    
    // Configuration
    uint256 public minAllocationAmount = 100; // Minimum allocation in USD (scaled by 1e18)
    uint256 public maxAllocationAmount = 10000000 * 1e18; // Maximum allocation
    uint256 public autoReleaseDelay = 7 days; // Default auto-release delay
    uint256 public documentReviewPeriod = 3 days; // Time for document review
    
    // Events
    event FundAllocated(
        uint256 indexed allocationId,
        address indexed vendor,
        address indexed allocatedBy,
        uint256 amount,
        string projectId
    );
    
    event FundReleased(
        uint256 indexed allocationId,
        address indexed vendor,
        uint256 amount,
        uint256 milestoneId,
        bool autoRelease
    );
    
    event FundWithdrawn(
        address indexed vendor,
        uint256 amount,
        address destination
    );
    
    event FundReallocated(
        uint256 indexed allocationId,
        address indexed fromVendor,
        address indexed toVendor,
        uint256 amount,
        string reason
    );
    
    event DocumentUploaded(
        uint256 indexed allocationId,
        uint256 indexed documentId,
        string hash,
        string documentType
    );
    
    event DocumentReviewed(
        uint256 indexed allocationId,
        uint256 indexed documentId,
        DocumentStatus status,
        address reviewedBy
    );
    
    event MilestoneAdded(
        uint256 indexed allocationId,
        uint256 indexed milestoneId,
        uint256 amount,
        uint256 dueDate
    );
    
    event AllocationFrozen(
        uint256 indexed allocationId,
        uint256 amount,
        string reason
    );
    
    event AllocationUnfrozen(
        uint256 indexed allocationId,
        uint256 amount
    );
    
    event AutoReleaseTriggered(
        uint256 indexed allocationId,
        uint256 amount,
        string trigger
    );
    
    // Modifiers
    modifier onlyValidAllocation(uint256 _allocationId) {
        require(_allocationId > 0 && _allocationId <= _allocationIds.current(), "Invalid allocation ID");
        _;
    }
    
    modifier onlyVendorOrAdmin(uint256 _allocationId) {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            allocations[_allocationId].vendor == msg.sender,
            "Unauthorized access"
        );
        _;
    }
    
    modifier onlyActiveAllocation(uint256 _allocationId) {
        require(
            allocations[_allocationId].status != AllocationStatus.CANCELLED,
            "Allocation is cancelled"
        );
        _;
    }
    
    modifier validAmount(uint256 _amount) {
        require(
            _amount >= minAllocationAmount && _amount <= maxAllocationAmount,
            "Amount outside allowed range"
        );
        _;
    }
    
    // Constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Allocate funds to a vendor for a specific project
     */
    function allocateFunds(
        address _vendor,
        uint256 _amount,
        string memory _projectId,
        bool _autoReleaseEnabled
    ) external onlyRole(ADMIN_ROLE) validAmount(_amount) whenNotPaused nonReentrant {
        require(_vendor != address(0), "Invalid vendor address");
        require(bytes(_projectId).length > 0, "Project ID required");
        require(hasRole(VENDOR_ROLE, _vendor), "Address is not a registered vendor");
        
        _allocationIds.increment();
        uint256 allocationId = _allocationIds.current();
        
        FundAllocation storage allocation = allocations[allocationId];
        allocation.allocationId = allocationId;
        allocation.vendor = _vendor;
        allocation.allocatedBy = msg.sender;
        allocation.totalAmount = _amount;
        allocation.releasedAmount = 0;
        allocation.frozenAmount = 0;
        allocation.status = AllocationStatus.ALLOCATED;
        allocation.projectId = _projectId;
        allocation.createdAt = block.timestamp;
        allocation.updatedAt = block.timestamp;
        allocation.autoReleaseEnabled = _autoReleaseEnabled;
        
        // Update vendor wallet
        VendorWallet storage wallet = vendorWallets[_vendor];
        wallet.walletAddress = _vendor;
        wallet.totalAllocated += _amount;
        wallet.lastActivityAt = block.timestamp;
        if (!wallet.isActive) {
            wallet.isActive = true;
        }
        
        // Add to vendor allocations
        vendorAllocations[_vendor].push(allocationId);
        projectAllocations[_projectId] = allocationId;
        
        // Record transaction
        _recordTransaction(
            allocationId,
            TransactionType.ALLOCATION,
            msg.sender,
            _vendor,
            _amount,
            "Fund allocation"
        );
        
        emit FundAllocated(allocationId, _vendor, msg.sender, _amount, _projectId);
    }
    
    /**
     * @dev Add milestone to an allocation
     */
    function addMilestone(
        uint256 _allocationId,
        uint256 _amount,
        uint256 _dueDate,
        string memory _description,
        bool _autoRelease
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) onlyActiveAllocation(_allocationId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_dueDate > block.timestamp, "Due date must be in the future");
        
        FundAllocation storage allocation = allocations[_allocationId];
        require(
            allocation.releasedAmount + _amount <= allocation.totalAmount,
            "Milestone amount exceeds available funds"
        );
        
        uint256 milestoneId = allocation.milestoneCount++;
        Milestone storage milestone = allocation.milestones[milestoneId];
        milestone.amount = _amount;
        milestone.dueDate = _dueDate;
        milestone.description = _description;
        milestone.autoRelease = _autoRelease;
        milestone.isReleased = false;
        
        allocation.updatedAt = block.timestamp;
        
        emit MilestoneAdded(_allocationId, milestoneId, _amount, _dueDate);
    }
    
    /**
     * @dev Upload document for compliance
     */
    function uploadDocument(
        uint256 _allocationId,
        string memory _hash,
        string memory _documentType
    ) external onlyVendorOrAdmin(_allocationId) onlyValidAllocation(_allocationId) {
        require(bytes(_hash).length > 0, "Document hash required");
        require(bytes(_documentType).length > 0, "Document type required");
        
        FundAllocation storage allocation = allocations[_allocationId];
        uint256 documentId = allocation.documentCount++;
        
        Document storage doc = allocation.documents[documentId];
        doc.hash = _hash;
        doc.documentType = _documentType;
        doc.status = DocumentStatus.PENDING;
        doc.uploadedAt = block.timestamp;
        
        allocation.updatedAt = block.timestamp;
        
        emit DocumentUploaded(_allocationId, documentId, _hash, _documentType);
        
        // Check for auto-release conditions
        if (allocation.autoReleaseEnabled) {
            _checkAutoReleaseConditions(_allocationId);
        }
    }
    
    /**
     * @dev Review uploaded document
     */
    function reviewDocument(
        uint256 _allocationId,
        uint256 _documentId,
        DocumentStatus _status,
        string memory _comments
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) {
        require(_status != DocumentStatus.PENDING, "Must approve or reject");
        
        FundAllocation storage allocation = allocations[_allocationId];
        require(_documentId < allocation.documentCount, "Invalid document ID");
        
        Document storage doc = allocation.documents[_documentId];
        require(doc.status == DocumentStatus.PENDING, "Document already reviewed");
        
        doc.status = _status;
        doc.reviewedAt = block.timestamp;
        doc.reviewedBy = msg.sender;
        doc.comments = _comments;
        
        allocation.updatedAt = block.timestamp;
        
        emit DocumentReviewed(_allocationId, _documentId, _status, msg.sender);
        
        // Check for auto-release conditions
        if (allocation.autoReleaseEnabled && _status == DocumentStatus.APPROVED) {
            _checkAutoReleaseConditions(_allocationId);
        }
    }
    
    /**
     * @dev Release funds manually
     */
    function releaseFunds(
        uint256 _allocationId,
        uint256 _amount,
        uint256 _milestoneId
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) onlyActiveAllocation(_allocationId) nonReentrant {
        FundAllocation storage allocation = allocations[_allocationId];
        require(_amount > 0, "Amount must be greater than 0");
        require(
            allocation.releasedAmount + _amount <= allocation.totalAmount - allocation.frozenAmount,
            "Insufficient available funds"
        );
        
        // Release milestone if specified
        if (_milestoneId < allocation.milestoneCount) {
            Milestone storage milestone = allocation.milestones[_milestoneId];
            require(!milestone.isReleased, "Milestone already released");
            require(milestone.amount == _amount, "Amount doesn't match milestone");
            
            milestone.isReleased = true;
            milestone.releasedAt = block.timestamp;
        }
        
        allocation.releasedAmount += _amount;
        allocation.updatedAt = block.timestamp;
        
        // Update status
        if (allocation.releasedAmount >= allocation.totalAmount - allocation.frozenAmount) {
            allocation.status = AllocationStatus.FULLY_RELEASED;
        } else if (allocation.releasedAmount > 0) {
            allocation.status = AllocationStatus.PARTIALLY_RELEASED;
        }
        
        // Update vendor wallet
        VendorWallet storage wallet = vendorWallets[allocation.vendor];
        wallet.totalReleased += _amount;
        wallet.lastActivityAt = block.timestamp;
        
        // Record transaction
        _recordTransaction(
            _allocationId,
            TransactionType.RELEASE,
            msg.sender,
            allocation.vendor,
            _amount,
            "Manual fund release"
        );
        
        emit FundReleased(_allocationId, allocation.vendor, _amount, _milestoneId, false);
    }
    
    /**
     * @dev Withdraw funds to external address
     */
    function withdrawFunds(
        uint256 _amount,
        address _destination
    ) external onlyRole(VENDOR_ROLE) nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_destination != address(0), "Invalid destination address");
        
        VendorWallet storage wallet = vendorWallets[msg.sender];
        require(wallet.isActive, "Wallet is not active");
        
        uint256 availableBalance = wallet.totalReleased - wallet.totalWithdrawn - wallet.frozenAmount;
        require(_amount <= availableBalance, "Insufficient available balance");
        
        wallet.totalWithdrawn += _amount;
        wallet.lastActivityAt = block.timestamp;
        
        // Record transaction
        _recordTransaction(
            0, // No specific allocation
            TransactionType.WITHDRAWAL,
            msg.sender,
            _destination,
            _amount,
            "Vendor withdrawal"
        );
        
        emit FundWithdrawn(msg.sender, _amount, _destination);
    }
    
    /**
     * @dev Reallocate funds between vendors
     */
    function reallocateFunds(
        uint256 _allocationId,
        address _newVendor,
        uint256 _amount,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) onlyActiveAllocation(_allocationId) nonReentrant {
        require(_newVendor != address(0), "Invalid new vendor address");
        require(hasRole(VENDOR_ROLE, _newVendor), "New address is not a registered vendor");
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_reason).length > 0, "Reason required");
        
        FundAllocation storage allocation = allocations[_allocationId];
        address oldVendor = allocation.vendor;
        require(oldVendor != _newVendor, "Cannot reallocate to same vendor");
        
        uint256 availableAmount = allocation.totalAmount - allocation.releasedAmount - allocation.frozenAmount;
        require(_amount <= availableAmount, "Insufficient available funds");
        
        // Update old vendor wallet
        VendorWallet storage oldWallet = vendorWallets[oldVendor];
        oldWallet.totalAllocated -= _amount;
        
        // Update new vendor wallet
        VendorWallet storage newWallet = vendorWallets[_newVendor];
        newWallet.walletAddress = _newVendor;
        newWallet.totalAllocated += _amount;
        newWallet.lastActivityAt = block.timestamp;
        if (!newWallet.isActive) {
            newWallet.isActive = true;
        }
        
        // Create new allocation for new vendor
        _allocationIds.increment();
        uint256 newAllocationId = _allocationIds.current();
        
        FundAllocation storage newAllocation = allocations[newAllocationId];
        newAllocation.allocationId = newAllocationId;
        newAllocation.vendor = _newVendor;
        newAllocation.allocatedBy = msg.sender;
        newAllocation.totalAmount = _amount;
        newAllocation.releasedAmount = 0;
        newAllocation.frozenAmount = 0;
        newAllocation.status = AllocationStatus.ALLOCATED;
        newAllocation.projectId = allocation.projectId;
        newAllocation.createdAt = block.timestamp;
        newAllocation.updatedAt = block.timestamp;
        newAllocation.autoReleaseEnabled = allocation.autoReleaseEnabled;
        
        // Reduce original allocation
        allocation.totalAmount -= _amount;
        allocation.updatedAt = block.timestamp;
        
        // Add to new vendor allocations
        vendorAllocations[_newVendor].push(newAllocationId);
        
        // Record transactions
        _recordTransaction(
            _allocationId,
            TransactionType.REALLOCATION,
            oldVendor,
            _newVendor,
            _amount,
            _reason
        );
        
        emit FundReallocated(_allocationId, oldVendor, _newVendor, _amount, _reason);
    }
    
    /**
     * @dev Freeze allocation funds
     */
    function freezeAllocation(
        uint256 _allocationId,
        uint256 _amount,
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) onlyActiveAllocation(_allocationId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_reason).length > 0, "Reason required");
        
        FundAllocation storage allocation = allocations[_allocationId];
        uint256 availableAmount = allocation.totalAmount - allocation.releasedAmount - allocation.frozenAmount;
        require(_amount <= availableAmount, "Insufficient available funds to freeze");
        
        allocation.frozenAmount += _amount;
        allocation.updatedAt = block.timestamp;
        
        if (allocation.frozenAmount + allocation.releasedAmount >= allocation.totalAmount) {
            allocation.status = AllocationStatus.FROZEN;
        }
        
        // Update vendor wallet
        VendorWallet storage wallet = vendorWallets[allocation.vendor];
        wallet.frozenAmount += _amount;
        
        // Record transaction
        _recordTransaction(
            _allocationId,
            TransactionType.FREEZE,
            msg.sender,
            allocation.vendor,
            _amount,
            _reason
        );
        
        emit AllocationFrozen(_allocationId, _amount, _reason);
    }
    
    /**
     * @dev Unfreeze allocation funds
     */
    function unfreezeAllocation(
        uint256 _allocationId,
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) onlyValidAllocation(_allocationId) {
        require(_amount > 0, "Amount must be greater than 0");
        
        FundAllocation storage allocation = allocations[_allocationId];
        require(_amount <= allocation.frozenAmount, "Amount exceeds frozen funds");
        
        allocation.frozenAmount -= _amount;
        allocation.updatedAt = block.timestamp;
        
        // Update status if fully unfrozen
        if (allocation.frozenAmount == 0) {
            if (allocation.releasedAmount >= allocation.totalAmount) {
                allocation.status = AllocationStatus.FULLY_RELEASED;
            } else if (allocation.releasedAmount > 0) {
                allocation.status = AllocationStatus.PARTIALLY_RELEASED;
            } else {
                allocation.status = AllocationStatus.ALLOCATED;
            }
        }
        
        // Update vendor wallet
        VendorWallet storage wallet = vendorWallets[allocation.vendor];
        wallet.frozenAmount -= _amount;
        
        // Record transaction
        _recordTransaction(
            _allocationId,
            TransactionType.UNFREEZE,
            msg.sender,
            allocation.vendor,
            _amount,
            "Funds unfrozen"
        );
        
        emit AllocationUnfrozen(_allocationId, _amount);
    }
    
    /**
     * @dev Check and execute auto-release conditions
     */
    function _checkAutoReleaseConditions(uint256 _allocationId) internal {
        FundAllocation storage allocation = allocations[_allocationId];
        
        if (!allocation.autoReleaseEnabled) return;
        
        // Check if all required documents are approved
        bool allDocumentsApproved = true;
        for (uint256 i = 0; i < allocation.documentCount; i++) {
            if (allocation.documents[i].status != DocumentStatus.APPROVED) {
                allDocumentsApproved = false;
                break;
            }
        }
        
        if (allDocumentsApproved && allocation.documentCount > 0) {
            // Auto-release all pending milestones
            for (uint256 i = 0; i < allocation.milestoneCount; i++) {
                Milestone storage milestone = allocation.milestones[i];
                if (!milestone.isReleased && milestone.autoRelease) {
                    if (block.timestamp >= milestone.dueDate || allDocumentsApproved) {
                        milestone.isReleased = true;
                        milestone.releasedAt = block.timestamp;
                        
                        allocation.releasedAmount += milestone.amount;
                        
                        // Update vendor wallet
                        VendorWallet storage wallet = vendorWallets[allocation.vendor];
                        wallet.totalReleased += milestone.amount;
                        wallet.lastActivityAt = block.timestamp;
                        
                        // Record transaction
                        _recordTransaction(
                            _allocationId,
                            TransactionType.RELEASE,
                            address(this),
                            allocation.vendor,
                            milestone.amount,
                            "Auto-release triggered"
                        );
                        
                        emit FundReleased(_allocationId, allocation.vendor, milestone.amount, i, true);
                        emit AutoReleaseTriggered(_allocationId, milestone.amount, "Documents approved");
                    }
                }
            }
            
            // Update allocation status
            if (allocation.releasedAmount >= allocation.totalAmount - allocation.frozenAmount) {
                allocation.status = AllocationStatus.FULLY_RELEASED;
            } else if (allocation.releasedAmount > 0) {
                allocation.status = AllocationStatus.PARTIALLY_RELEASED;
            }
            
            allocation.updatedAt = block.timestamp;
        }
    }
    
    /**
     * @dev Record transaction for audit trail
     */
    function _recordTransaction(
        uint256 _allocationId,
        TransactionType _type,
        address _from,
        address _to,
        uint256 _amount,
        string memory _description
    ) internal {
        _transactionIds.increment();
        uint256 transactionId = _transactionIds.current();
        
        Transaction storage txn = transactions[transactionId];
        txn.transactionId = transactionId;
        txn.allocationId = _allocationId;
        txn.transactionType = _type;
        txn.from = _from;
        txn.to = _to;
        txn.amount = _amount;
        txn.timestamp = block.timestamp;
        txn.description = _description;
        
        // Create data hash for integrity
        txn.dataHash = keccak256(abi.encodePacked(
            transactionId,
            _allocationId,
            _type,
            _from,
            _to,
            _amount,
            block.timestamp,
            _description
        ));
    }
    
    // View functions
    function getAllocation(uint256 _allocationId) external view returns (
        uint256 allocationId,
        address vendor,
        address allocatedBy,
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 frozenAmount,
        AllocationStatus status,
        string memory projectId,
        uint256 createdAt,
        uint256 updatedAt,
        bool autoReleaseEnabled
    ) {
        FundAllocation storage allocation = allocations[_allocationId];
        return (
            allocation.allocationId,
            allocation.vendor,
            allocation.allocatedBy,
            allocation.totalAmount,
            allocation.releasedAmount,
            allocation.frozenAmount,
            allocation.status,
            allocation.projectId,
            allocation.createdAt,
            allocation.updatedAt,
            allocation.autoReleaseEnabled
        );
    }
    
    function getVendorWallet(address _vendor) external view returns (VendorWallet memory) {
        return vendorWallets[_vendor];
    }
    
    function getTransaction(uint256 _transactionId) external view returns (Transaction memory) {
        return transactions[_transactionId];
    }
    
    function getVendorAllocations(address _vendor) external view returns (uint256[] memory) {
        return vendorAllocations[_vendor];
    }
    
    function getMilestone(uint256 _allocationId, uint256 _milestoneId) external view returns (Milestone memory) {
        return allocations[_allocationId].milestones[_milestoneId];
    }
    
    function getDocument(uint256 _allocationId, uint256 _documentId) external view returns (Document memory) {
        return allocations[_allocationId].documents[_documentId];
    }
    
    // Admin functions
    function setMinAllocationAmount(uint256 _amount) external onlyRole(ADMIN_ROLE) {
        minAllocationAmount = _amount;
    }
    
    function setMaxAllocationAmount(uint256 _amount) external onlyRole(ADMIN_ROLE) {
        maxAllocationAmount = _amount;
    }
    
    function setAutoReleaseDelay(uint256 _delay) external onlyRole(ADMIN_ROLE) {
        autoReleaseDelay = _delay;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function addVendor(address _vendor) external onlyRole(ADMIN_ROLE) {
        _grantRole(VENDOR_ROLE, _vendor);
    }
    
    function removeVendor(address _vendor) external onlyRole(ADMIN_ROLE) {
        _revokeRole(VENDOR_ROLE, _vendor);
        vendorWallets[_vendor].isActive = false;
    }
    
    function addAuditor(address _auditor) external onlyRole(ADMIN_ROLE) {
        _grantRole(AUDITOR_ROLE, _auditor);
    }
    
    // Emergency functions
    function emergencyFreeze(uint256 _allocationId) external onlyRole(ADMIN_ROLE) {
        FundAllocation storage allocation = allocations[_allocationId];
        uint256 availableAmount = allocation.totalAmount - allocation.releasedAmount - allocation.frozenAmount;
        if (availableAmount > 0) {
            allocation.frozenAmount += availableAmount;
            allocation.status = AllocationStatus.FROZEN;
            allocation.updatedAt = block.timestamp;
            
            emit AllocationFrozen(_allocationId, availableAmount, "Emergency freeze");
        }
    }
    
    function emergencyCancel(uint256 _allocationId) external onlyRole(ADMIN_ROLE) {
        allocations[_allocationId].status = AllocationStatus.CANCELLED;
        allocations[_allocationId].updatedAt = block.timestamp;
    }
}