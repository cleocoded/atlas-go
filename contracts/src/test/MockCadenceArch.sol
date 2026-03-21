// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Test-only mock for the Cadence Arch precompile on Flow EVM.
///      Deployed to 0x0000000000000000000000010000000000000001 via hardhat_setCode.
contract MockCadenceArch {
    uint64 public currentBlockHeight;

    function flowBlockHeight() external view returns (uint64) {
        return currentBlockHeight;
    }

    function getRandomSource(uint64 flowHeight) external pure returns (bytes32) {
        return keccak256(abi.encode(flowHeight));
    }

    function setBlockHeight(uint64 h) external {
        currentBlockHeight = h;
    }
}
