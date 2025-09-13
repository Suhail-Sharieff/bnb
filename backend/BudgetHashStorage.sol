// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BudgetHashStorage
 * @dev Smart contract to store budget data with readable information
 */
contract BudgetHashStorage {
    // State variables
    string private storedHash;
    string private budgetData; // Store readable budget data
    address public owner;
    
    // Budget data structure for events
    struct BudgetInfo {
        string project;
        uint256 amount;
        string department;
        string submittedBy;
        string submissionDate;
        string approvalStatus;
    }
    
    // Events with readable data
    event HashStored(string indexed hash, address indexed storer, uint256 timestamp);
    event BudgetSubmitted(
        string project,
        uint256 amount, 
        string department,
        string submittedBy,
        string submissionDate,
        string approvalStatus,
        string dataHash,
        address indexed submitter,
        uint256 timestamp
    );
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Store budget data with readable information
     */
    function storeBudgetData(
        string memory _hash,
        string memory _project,
        uint256 _amount,
        string memory _department,
        string memory _submittedBy,
        string memory _submissionDate,
        string memory _approvalStatus
    ) public {
        require(bytes(_hash).length > 0, "Hash cannot be empty");
        require(bytes(_project).length > 0, "Project name required");
        
        storedHash = _hash;
        
        // Store readable budget data as JSON string
        budgetData = string(abi.encodePacked(
            '{"project":"', _project,
            '","amount":', _uint2str(_amount),
            ',"department":"', _department,
            '","submittedBy":"', _submittedBy,
            '","submissionDate":"', _submissionDate,
            '","approvalStatus":"', _approvalStatus, '"}'
        ));
        
        // Emit detailed event with all budget information
        emit BudgetSubmitted(
            _project,
            _amount,
            _department,
            _submittedBy,
            _submissionDate,
            _approvalStatus,
            _hash,
            msg.sender,
            block.timestamp
        );
        
        // Also emit the original hash event
        emit HashStored(_hash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Store simple hash (backward compatibility)
     */
    function storeHash(string memory _hash) public {
        require(bytes(_hash).length > 0, "Hash cannot be empty");
        storedHash = _hash;
        emit HashStored(_hash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get stored hash
     */
    function getHash() public view returns (string memory) {
        return storedHash;
    }
    
    /**
     * @dev Get stored hash (view function)
     */
    function getHashView() public view returns (string memory) {
        return storedHash;
    }
    
    /**
     * @dev Get readable budget data
     */
    function getBudgetData() public view returns (string memory) {
        return budgetData;
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
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
}