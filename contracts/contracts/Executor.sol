// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PolicyRegistry.sol";
import "./PDRLogger.sol";
import "./zk/PolicyCheckVerifier.sol";

/**
 * @title Executor
 * @dev Executes AI agent transactions with ZK-verified policy compliance
 * Now uses real ZK proofs from policy_check circuit
 */
contract Executor {
    PolicyRegistry public policyRegistry;
    PDRLogger public pdrLogger;
    Groth16Verifier public policyCheckVerifier;
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

    constructor(address _policyRegistryAddress, address _pdrLoggerAddress, address _policyCheckVerifierAddress) {
        owner = msg.sender;
        policyRegistry = PolicyRegistry(_policyRegistryAddress);
        pdrLogger = PDRLogger(_pdrLoggerAddress);
        policyCheckVerifier = Groth16Verifier(_policyCheckVerifierAddress);
    }

    /**
     * @dev Execute an agent action with ZK proof verification
     * Verifies that the action complies with the agent's on-chain policy using ZK proof
     *
     * @param agent The address of the AI agent attempting execution
     * @param actionType Type of action (e.g., "TRADE", "VOTE")
     * @param proofA First component of ZK proof
     * @param proofB Second component of ZK proof (2D array for pairing)
     * @param proofC Third component of ZK proof
     * @param pubSignals Public signals from the ZK proof [isCompliant]
     * @return success True if execution was authorized, false otherwise
     */
    function executeWithVerification(
        address agent,
        string calldata actionType,
        uint[2] calldata proofA,
        uint[2][2] calldata proofB,
        uint[2] calldata proofC,
        uint[1] calldata pubSignals
    ) external returns (bool success) {
        // Check if agent has a registered policy
        require(
            policyRegistry.hasPolicy(agent),
            "Agent must have registered policy to execute"
        );

        // Get the agent's current policy hash
        bytes32 policyHash = policyRegistry.getPolicy(agent);

        // Extract compliance from public signals
        // pubSignals[0] = isCompliant (1 if compliant, 0 if not)
        uint isCompliant = pubSignals[0];

        // Verify the ZK proof with correct public inputs
        bool proofValid = policyCheckVerifier.verifyProof(proofA, proofB, proofC, pubSignals);

        // Authorization requires both proof validity AND compliance flag
        bool isAuthorized = proofValid && (isCompliant == 1);

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

    /**
     * @dev Update the PolicyCheckVerifier address (owner only)
     * @param newVerifier The new verifier contract address
     */
    function setPolicyCheckVerifier(address newVerifier) external onlyOwner {
        policyCheckVerifier = Groth16Verifier(newVerifier);
    }
}
