pragma solidity ^0.4.24;

import "./IEIP820Registry.sol";


contract EIP820Implementer {
  bytes32 constant EIP820_ACCEPT_MAGIC = keccak256("EIP820_ACCEPT_MAGIC");
  IEIP820Registry public eip820Registry;

  function setIntrospectionRegistry(address _eip820RegistryAddr) internal {
    eip820Registry = IEIP820Registry(_eip820RegistryAddr);
  }

  function setInterfaceImplementation(string ifaceLabel, address impl) internal {
    bytes32 ifaceHash = keccak256(ifaceLabel);
    eip820Registry.setInterfaceImplementer(this, ifaceHash, impl);
  }

  function interfaceAddr(address addr, string ifaceLabel) internal view returns(address) {
    bytes32 ifaceHash = keccak256(ifaceLabel);
    return eip820Registry.getInterfaceImplementer(addr, ifaceHash);
  }

  function delegateManagement(address newManager) internal {
    eip820Registry.setManager(this, newManager);
  }
}