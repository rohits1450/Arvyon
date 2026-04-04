// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/PDRLogger.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PDRLogger
 * @dev Policy Decision Record Logger — emits immutable audit trail of AI agent decisions
 * Stores no state, only pure event emission for on-chain audit purposes
 */
contract PDRLogger {
    /**
     * @dev Emitted when an agent decision is logged
     * @param agent The address of the AI agent
     * @param actionType Type of action being executed (e.g., "TRADE", "VOTE", "DATA_ACCESS")
     * @param policyHash The bytes32 hash of the policy being verified against
     * @param isCompliant Boolean indicating if the action complied with policy
     * @param timestamp Block timestamp when decision was recorded
     */
    event DecisionLogged(
        address indexed agent,
        string actionType,
        bytes32 indexed policyHash,
        bool isCompliant,
        uint256 timestamp
    );

    /**
     * @dev Log an AI agent decision with full compliance audit trail
     * @param agent The address of the AI agent
     * @param actionType Type of action being executed
     * @param policyHash The bytes32 hash of the policy
     * @param isCompliant Whether the action complies with the policy
     */
    function logDecision(
        address agent,
        string calldata actionType,
        bytes32 policyHash,
        bool isCompliant
    ) external {
        emit DecisionLogged(agent, actionType, policyHash, isCompliant, block.timestamp);
    }
}


// File contracts/PolicyRegistry.sol

// Original license: SPDX_License_Identifier: MIT
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


// File contracts/Executor.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.19;


/**
 * @title Executor
 * @dev STUB VERSION: Executes AI agent transactions with policy compliance verification
 * In production, isVerified would be a real ZK proof — for now it's a test parameter
 */
contract Executor {
    PolicyRegistry public policyRegistry;
    PDRLogger public pdrLogger;
    address public owner;

    event ExecutionAttempted(
        address indexed agent,
        bool isAuthorized,
        string actionType,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _policyRegistryAddress, address _pdrLoggerAddress) {
        owner = msg.sender;
        policyRegistry = PolicyRegistry(_policyRegistryAddress);
        pdrLogger = PDRLogger(_pdrLoggerAddress);
    }

    /**
     * @dev STUB: Execute an agent action with hardcoded ZK verification
     * In production, isVerified would come from actual ZK proof verification
     *
     * @param agent The address of the AI agent attempting execution
     * @param actionType Type of action (e.g., "TRADE", "VOTE")
     * @param isVerified STUB: Hardcoded boolean — will be replaced with real ZK proof check
     * @return success True if execution was authorized, false otherwise
     */
    function executeWithVerification(
        address agent,
        string calldata actionType,
        bool isVerified
    ) external returns (bool success) {
        // Check if agent has a registered policy
        require(
            policyRegistry.hasPolicy(agent),
            "Agent must have registered policy to execute"
        );

        // Get the agent's current policy hash
        bytes32 policyHash = policyRegistry.getPolicy(agent);

        // STUB: In production, this would verify a real ZK proof
        // For now, isVerified is a test parameter passed by the caller
        bool isAuthorized = isVerified && policyRegistry.hasPolicy(agent);

        // Log the decision in the PDR (Policy Decision Record)
        pdrLogger.logDecision(agent, actionType, policyHash, isAuthorized);

        // Emit execution event
        emit ExecutionAttempted(agent, isAuthorized, actionType, block.timestamp);

        return isAuthorized;
    }

    /**
     * @dev Retrieve the registered policy for an agent
     * @param agent The agent address to query
     * @return The bytes32 policy hash
     */
    function getAgentPolicy(address agent) external view returns (bytes32) {
        return policyRegistry.getPolicy(agent);
    }

    /**
     * @dev Check if an agent has a registered policy
     * @param agent The agent address to query
     * @return True if agent has policy, false otherwise
     */
    function isAgentCompliant(address agent) external view returns (bool) {
        return policyRegistry.hasPolicy(agent);
    }

    /**
     * @dev Update the PolicyRegistry address (owner only)
     * @param newPolicyRegistry The new PolicyRegistry contract address
     */
    function setPolicyRegistry(address newPolicyRegistry) external onlyOwner {
        policyRegistry = PolicyRegistry(newPolicyRegistry);
    }

    /**
     * @dev Update the PDRLogger address (owner only)
     * @param newPDRLogger The new PDRLogger contract address
     */
    function setPDRLogger(address newPDRLogger) external onlyOwner {
        pdrLogger = PDRLogger(newPDRLogger);
    }
}
