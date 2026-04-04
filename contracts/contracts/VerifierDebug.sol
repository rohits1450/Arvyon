// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./zk/PolicyCheckVerifier.sol";

/**
 * @title VerifierDebug
 * @dev Test contract to debug verifier gas consumption
 */
contract VerifierDebug {
    Groth16Verifier public verifier;

    constructor(address _verifier) {
        verifier = Groth16Verifier(_verifier);
    }

    function testVerifyProof(
        uint[2] calldata proofA,
        uint[2][2] calldata proofB,
        uint[2] calldata proofC,
        uint[1] calldata pubSignals
    ) external view returns (bool) {
        // This will help us see gas consumption of just the verification
        return verifier.verifyProof(proofA, proofB, proofC, pubSignals);
    }
}
