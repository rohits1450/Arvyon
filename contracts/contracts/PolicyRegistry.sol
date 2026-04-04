// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PolicyRegistry
 * @dev Stores ZK-verified AI agent behavioral policies as bytes32 hashes
 * Other contracts reference this registry to verify agent compliance
 */
contract PolicyRegistry {
    // State Variables
    mapping(address => bytes32) public policies;
    address public owner;
    mapping(address => uint256) public policyTimestamps;

    // Events
    event PolicyRegistered(address indexed user, bytes32 policyHash, uint256 timestamp);
    event PolicyUpdated(address indexed user, bytes32 oldPolicyHash, bytes32 newPolicyHash, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Sets the owner to the contract deployer
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Register a new policy for the caller
     * @param policyHash The bytes32 hash of the AI agent's behavioral policy
     * @notice Caller must not already have a registered policy
     */
    function registerPolicy(bytes32 policyHash) external {
        require(policyHash != bytes32(0), "Policy hash cannot be empty");
        require(policies[msg.sender] == bytes32(0), "Policy already registered for this address");

        policies[msg.sender] = policyHash;
        policyTimestamps[msg.sender] = block.timestamp;

        emit PolicyRegistered(msg.sender, policyHash, block.timestamp);
    }

    /**
     * @dev Update an existing policy for the caller
     * @param newPolicyHash The new bytes32 hash of the AI agent's behavioral policy
     * @notice Caller must already have a registered policy
     * @notice New hash must be different from current hash
     */
    function updatePolicy(bytes32 newPolicyHash) external {
        require(newPolicyHash != bytes32(0), "New policy hash cannot be empty");
        require(policies[msg.sender] != bytes32(0), "No policy registered for this address");
        require(newPolicyHash != policies[msg.sender], "New policy hash must be different from current hash");

        bytes32 oldPolicyHash = policies[msg.sender];
        policies[msg.sender] = newPolicyHash;
        policyTimestamps[msg.sender] = block.timestamp;

        emit PolicyUpdated(msg.sender, oldPolicyHash, newPolicyHash, block.timestamp);
    }

    /**
     * @dev Retrieve the policy hash for a given address
     * @param user The address to query
     * @return The bytes32 policy hash, or bytes32(0) if no policy exists
     */
    function getPolicy(address user) external view returns (bytes32) {
        return policies[user];
    }

    /**
     * @dev Check if an address has a registered policy
     * @param user The address to query
     * @return True if policy exists, false otherwise
     */
    function hasPolicy(address user) external view returns (bool) {
        return policies[user] != bytes32(0);
    }

    /**
     * @dev Get the timestamp when a policy was last registered or updated
     * @param user The address to query
     * @return The timestamp of the policy, or 0 if no policy exists
     */
    function getPolicyTimestamp(address user) external view returns (uint256) {
        return policyTimestamps[user];
    }

    /**
     * @dev Allow a user to revoke their registered policy
     * @notice Caller must have an existing policy
     */
    function revokePolicy() external {
        require(policies[msg.sender] != bytes32(0), "No policy registered for this address");

        delete policies[msg.sender];
        delete policyTimestamps[msg.sender];

        emit PolicyRegistered(msg.sender, bytes32(0), block.timestamp);
    }
}
