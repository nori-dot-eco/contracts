pragma solidity ^0.4.24;

import "../Proxy.sol";

/**
 * @title UnstructuredUpgradeabilityProxy
 * @dev This contract represents a proxy where the implementation address to which it will delegate can be upgraded
 * This pattern uses an unstructured storage slot defined in the proxy contract to save the data required for upgradeability.
 */
contract UnstructuredUpgradeabilityProxy is Proxy {
  /**
   * @dev This event will be emitted every time the implementation gets upgraded
   * @param implementation representing the address of the upgraded implementation
   */
  event Upgraded(string version, address indexed implementation);

  // Storage position of the address of the current implementation
  bytes32 private constant implementationPosition = keccak256("org.nori.proxy.implementation");

  /**
   * @dev Constructor function
   */
  constructor () public {}

  /**
   * @dev Tells the address of the current implementation
   * @return address of the current implementation
   */
  function implementation() public view returns (address impl) {
    bytes32 position = implementationPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      impl := sload(position)
    }
  }

  /**
   * @dev Sets the address of the current implementation
   * @param newImplementation address representing the new implementation to be set
   */
  function setImplementation(address newImplementation) internal {
    bytes32 position = implementationPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, newImplementation)
    }
  }

  /**
   * @dev Upgrades the implementation address
   * @param newImplementation representing the address of the new implementation to be set
   */
  function _upgradeTo(address newImplementation) internal {
    address currentImplementation = implementation();
    require(currentImplementation != newImplementation);
    setImplementation(newImplementation);
  }
}