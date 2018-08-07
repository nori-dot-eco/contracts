pragma solidity ^0.4.24;

import "./UnstructuredUpgradeabilityProxy.sol";
import "../../registry/IContractRegistry.sol";

/**
 * @title UnstructuredOwnedUpgradeabilityProxy
 * @dev This contract combines an upgradeability proxy with basic authorization control functionalities
 */
contract UnstructuredOwnedUpgradeabilityProxy is UnstructuredUpgradeabilityProxy {
  /**
  * @dev Event to show ownership has been transferred
  * @param previousOwner representing the address of the previous owner
  * @param newOwner representing the address of the new owner
  */
  event ProxyOwnershipTransferred(address previousOwner, address newOwner);
  event UpgradeabilityOwnerSet(address upgradeabilityOwner);
  event RegistryAddrSet(address registryAddress);

  // Storage position of the owner of the contract
  bytes32 private constant proxyOwnerPosition = keccak256("org.nori.proxy.owner");

  //Storage position of the registry to keep track of versions
  //todo is it the case that adding this second reserved slot messes with storage elsewhere?
  bytes32 private constant registryAddrPosition = keccak256("org.nori.registry.address");

  /**
  * @dev the constructor sets the original owner of the contract to the sender account.
  */
  constructor (address registryAddr) public {
    setUpgradeabilityOwner(msg.sender);
    setRegistryAddr(registryAddr);
  }

  /**
  * @dev Throws if called by any account other than the owner.
  */
  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner());
    _;
  }

  /**
   * @dev Tells the address of the owner
   * @return the address of the owner
   */
  function proxyOwner() public view returns (address owner) {
    bytes32 position = proxyOwnerPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      owner := sload(position)
    }
  }

  /**
   * @dev Sets the address of the owner
   */
  function setUpgradeabilityOwner(address newProxyOwner) internal {
    bytes32 position = proxyOwnerPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, newProxyOwner)
    }
    emit UpgradeabilityOwnerSet(newProxyOwner);
  }

  /**
   * @dev Tells the address of the registry
   * @return the address of the registry
   */
  function registryAddr() public view returns (address registry) {
    bytes32 position = registryAddrPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      registry := sload(position)
    }
  }

  /**
   * @dev Sets the address of the regisrty
   */
  function setRegistryAddr(address registryAddress) internal {
    bytes32 position = registryAddrPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, registryAddress)
    }
    emit RegistryAddrSet(registryAddress);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferProxyOwnership(address newOwner) public onlyProxyOwner {
    require(newOwner != address(0));
    emit ProxyOwnershipTransferred(proxyOwner(), newOwner);
    setUpgradeabilityOwner(newOwner);
  }

  /**
   * @dev Allows the proxy owner to upgrade the current version of the proxy.
   * @param implementation representing the address of the new implementation to be set.
   */
  function upgradeTo(string contractName, string versionName, address implementation) public onlyProxyOwner {
    _upgradeTo(implementation);
    //todo register interface lookup using eip820 -- not including this now as implications are unknown
    address registry = registryAddr();
    IContractRegistry(registry).setVersion(
      contractName,
      address(this),
      versionName,
      implementation
    );
    //todo require version name doesnt exits
    emit Upgraded(versionName, implementation);
  }

  /**
   * @dev Allows the proxy owner to upgrade the current version of the proxy and call the new implementation
   * to initialize whatever is needed through a low level call.
   * @param implementation representing the address of the new implementation to be set.
   * @param data represents the msg.data to bet sent in the low level call. This parameter may include the function
   * signature of the implementation to be called with the needed payload
   */
  function upgradeToAndCall(
    string contractName,
    string versionName,
    address implementation,
    bytes data
  ) payable public onlyProxyOwner {
    upgradeTo(contractName, versionName, implementation);
    require(address(this).call.value(msg.value)(data)); //solium-disable-line security/no-call-value
  }
}