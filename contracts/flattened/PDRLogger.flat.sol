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
