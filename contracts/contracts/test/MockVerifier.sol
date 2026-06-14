// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockVerifier
 * @dev Test-only stand-in for the Groth16Verifier. Returns a configurable
 * result from verifyProof() so the Executor's authorized-execution path can be
 * exercised in unit tests without a real trusted-setup proof. The function
 * signature matches Groth16Verifier exactly so the Executor can call it.
 */
contract MockVerifier {
    bool public result;

    constructor(bool _result) {
        result = _result;
    }

    function setResult(bool _result) external {
        result = _result;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[1] calldata
    ) external view returns (bool) {
        return result;
    }
}
