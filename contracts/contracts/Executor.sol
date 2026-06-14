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

    // Simple reentrancy guard for the value-forwarding execution path.
    uint256 private _locked = 1;

    event ExecutionAttempted(
        address indexed agent,
        bool isAuthorized,
        string actionType,
        uint256 timestamp
    );

    /**
     * @dev Emitted when an authorized decision performs a real on-chain action.
     * @param agent The AI agent the action was executed on behalf of
     * @param target The contract/account the action was dispatched to
     * @param value Wei forwarded with the call
     * @param success Whether the dispatched call succeeded
     * @param returnData Raw return data from the dispatched call
     */
    event ActionExecuted(
        address indexed agent,
        address indexed target,
        uint256 value,
        bool success,
        bytes returnData
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "Reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address _policyRegistryAddress, address _pdrLoggerAddress, address _policyCheckVerifierAddress) {
        owner = msg.sender;
        policyRegistry = PolicyRegistry(_policyRegistryAddress);
        pdrLogger = PDRLogger(_pdrLoggerAddress);
        policyCheckVerifier = Groth16Verifier(_policyCheckVerifierAddress);
    }

    /**
     * @dev Execute an agent action with ZK proof verification.
     *
     * The decision is always verified against the agent's on-chain policy and
     * recorded in the PDR audit trail. When the decision is authorized (valid
     * proof AND compliance flag) and a non-zero `target` is supplied, the
     * Executor dispatches the real on-chain action by forwarding `msg.value`
     * and `payload` to `target`. With `target == address(0)` the call is a pure
     * verify-and-log operation (the audit-only primitive).
     *
     * Any ETH sent with a call that does not execute (unauthorized, or no
     * target) is refunded to the caller so funds are never trapped here.
     *
     * @param agent The address of the AI agent attempting execution
     * @param actionType Type of action (e.g., "TRADE", "VOTE")
     * @param target Contract/account to dispatch the authorized action to (0 = log only)
     * @param payload ABI-encoded calldata for the dispatched action
     * @param proofA First component of ZK proof
     * @param proofB Second component of ZK proof (2D array for pairing)
     * @param proofC Third component of ZK proof
     * @param pubSignals Public signals from the ZK proof [isCompliant]
     * @return isAuthorized True if execution was authorized, false otherwise
     */
    function executeWithVerification(
        address agent,
        string calldata actionType,
        address target,
        bytes calldata payload,
        uint[2] calldata proofA,
        uint[2][2] calldata proofB,
        uint[2] calldata proofC,
        uint[1] calldata pubSignals
    ) external payable nonReentrant returns (bool isAuthorized) {
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
        isAuthorized = proofValid && (isCompliant == 1);

        // Log the decision in the PDR (Policy Decision Record)
        pdrLogger.logDecision(agent, actionType, policyHash, isAuthorized);

        // Emit execution event
        emit ExecutionAttempted(agent, isAuthorized, actionType, block.timestamp);

        // Dispatch the real on-chain action only for authorized decisions that
        // declare a concrete target. Effects (log + event) are emitted above,
        // before any external call, and the nonReentrant guard protects the
        // value-forwarding path. Extracted into _dispatchAction to keep this
        // frame's stack within limits.
        if (isAuthorized && target != address(0)) {
            _dispatchAction(agent, target, payload);
        } else if (msg.value > 0) {
            // No action executed: refund any forwarded value to the caller.
            (bool refunded, ) = msg.sender.call{value: msg.value}("");
            require(refunded, "Executor: refund failed");
        }

        return isAuthorized;
    }

    /**
     * @dev Forward msg.value and payload to an authorized action's target.
     * Reverts the entire transaction if the dispatched call fails, so an
     * authorized-but-failed action never logs as a successful execution.
     */
    function _dispatchAction(address agent, address target, bytes calldata payload) private {
        (bool ok, bytes memory ret) = target.call{value: msg.value}(payload);
        require(ok, "Executor: action call reverted");
        emit ActionExecuted(agent, target, msg.value, ok, ret);
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
