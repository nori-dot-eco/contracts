pragma solidity ^0.4.18;

import "./IEIP820Registry.sol";


contract DEPRECATEDEIP820Implementer {
  bytes32 constant EIP820_ACCEPT_MAGIC = keccak256("EIP820_ACCEPT_MAGIC");
  IEIP820Registry eip820Registry;
  function DEPRECATEDEIP820Implementer (address _eip820RegistryAddr) public {
    eip820Registry = IEIP820Registry(_eip820RegistryAddr);
  }

  function setInterfaceImplementation(string ifaceLabel, address impl) internal {
    bytes32 ifaceHash = keccak256(ifaceLabel);
    eip820Registry.setInterfaceImplementer(this, ifaceHash, impl);
  }

  function interfaceAddr(address addr, string ifaceLabel) internal constant returns(address) {
    bytes32 ifaceHash = keccak256(ifaceLabel);
    return eip820Registry.getInterfaceImplementer(addr, ifaceHash);
  }

  function delegateManagement(address newManager) internal {
    eip820Registry.setManager(this, newManager);
  }
}
