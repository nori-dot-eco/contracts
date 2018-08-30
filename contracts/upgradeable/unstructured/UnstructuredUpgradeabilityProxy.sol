pragma solidity ^0.4.24;

import "../Proxy.sol";

/**
 * @title UnstructuredUpgradeabilityProxy: This contract represents a proxy where
 *        the implementation address to which it will delegate can be upgraded
 * @dev This pattern uses an unstructured storage slot defined in the proxy contract to save the data required for upgradeability.
 */
contract UnstructuredUpgradeabilityProxy is Proxy {
  /**
   * @notice This event will be emitted every time the implementation gets upgraded
   * @param implementation representing the address of the upgraded implementation
   */
  event Upgraded(string version, address indexed implementation);
  /**
  * @notice This event will be emitted every time the implementation contract is set
  * @param impPosition representing the address of the upgraded implementation
  */
  event ImplementationPositionSet(address indexed impPosition);

  // Storage position of the address of the current implementation
  bytes32 private constant implementationPosition = keccak256("org.nori.proxy.implementation");

  /**
   * @notice Constructor function
   */
  constructor () public {}

  /**
   * @notice Tells the address of the current implementation
   * @return address of the current implementation
   */
  function implementation() public view returns (address _impl) {
    bytes32 position = implementationPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      _impl := sload(position)
    }
  }

  /**
   * @notice Sets the address of the current implementation
   * @param _newImplementation address representing the new implementation to be set
   */
  function setImplementation(address _newImplementation) internal {
    bytes32 position = implementationPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, _newImplementation)
    }
    emit ImplementationPositionSet(_newImplementation);
  }

  /**
   * @notice Upgrades the implementation address
   * @param _newImplementation representing the address of the new implementation to be set
   */
  function _upgradeTo(address _newImplementation) internal {
    address currentImplementation = implementation();
    require(
      currentImplementation != _newImplementation,
      "You cannot upgrade using the same implementation address"
    ); //todo also require upgrade version changed
    setImplementation(_newImplementation);
  }
}