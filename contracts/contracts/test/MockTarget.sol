// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockTarget
 * @dev Test-only target for the Executor's real-action dispatch. Records the
 * last call it received (caller, value, payload) and exposes a `ping(uint256)`
 * method so tests can assert that an authorized decision actually reached its
 * target with the expected calldata and value.
 */
contract MockTarget {
    address public lastCaller;
    uint256 public lastValue;
    uint256 public lastArg;
    uint256 public callCount;

    event Pinged(address indexed caller, uint256 value, uint256 arg);

    function ping(uint256 arg) external payable returns (uint256) {
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastArg = arg;
        callCount += 1;
        emit Pinged(msg.sender, msg.value, arg);
        return arg;
    }

    receive() external payable {
        lastCaller = msg.sender;
        lastValue = msg.value;
        callCount += 1;
    }
}
