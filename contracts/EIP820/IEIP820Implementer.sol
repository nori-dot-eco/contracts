pragma solidity ^0.4.24;

interface IEIP820Implementer {
    /// @notice Contracts that implement an interferce in behalf of another contract must return true
    /// @param addr Address that the contract woll implement the interface in behalf of
    /// @param interfaceHash keccak256 of the name of the interface
    /// @return EIP820_ACCEPT_MAGIC if the contract can implement the interface represented by
    ///  `ìnterfaceHash` in behalf of `addr`
    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) view public returns(bytes32);
}