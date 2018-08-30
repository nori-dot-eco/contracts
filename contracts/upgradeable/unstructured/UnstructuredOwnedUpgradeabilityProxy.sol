pragma solidity ^0.4.24;

import "./UnstructuredUpgradeabilityProxy.sol";
import "../../registry/IContractRegistry.sol";

/**
 * @title UnstructuredOwnedUpgradeabilityProxy: This contract combines an upgradeability proxy
 *        with basic authorization control functionalities
 */
contract UnstructuredOwnedUpgradeabilityProxy is UnstructuredUpgradeabilityProxy {
  /**
  * @notice Event to show ownership has been transferred
  * @param previousOwner representing the address of the previous owner
  * @param newOwner representing the address of the new owner
  */
  event ProxyOwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  /**
  * @notice Event to show the account which can be used to upgrade the proxy
  * @param upgradeabilityOwner representing the address of the proxy owner who maintains
  *        the ability to upgrade
  */
  event UpgradeabilityOwnerSet(address indexed upgradeabilityOwner);
  /**
  * @notice Event to show the contract or root registry address that was set
  * @param registryAddress representing the address of the root or contract registry
  *        used to keep track of version info
  */
  event RegistryAddrSet(address indexed registryAddress);

  // Storage position of the owner of the contract
  bytes32 private constant proxyOwnerPosition = keccak256("org.nori.proxy.owner");

  //Storage position of the registry to keep track of versions
  //todo is it the case that adding this second reserved slot messes with storage elsewhere?
  bytes32 private constant registryAddrPosition = keccak256("org.nori.registry.address");

  /**
  * @notice the constructor sets the original owner of the contract to the sender account.
  * @param _registryAddr the contract or root registry address which is used to look up
  *         version info by contract name
  */
  constructor (address _registryAddr) public {
    setUpgradeabilityOwner(msg.sender);
    setRegistryAddr(_registryAddr);
  }

  /**
  * @dev Throws if called by any account other than the owner.
  */
  modifier onlyProxyOwner() {
    require(msg.sender == proxyOwner(), "Only the proxy owner can use this function");
    _;
  }

  /**
   * @notice Tells the address of the owner
   * @return the address of the owner
   */
  function proxyOwner() public view returns (address _owner) {
    bytes32 position = proxyOwnerPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      _owner := sload(position)
    }
  }

  /**
   * @notice Sets the address of the proxy owner
   * @dev We use the MultiAdmin address in all live scenarios
   * @param _newProxyOwner the account which will own the proxy
   */
  function setUpgradeabilityOwner(address _newProxyOwner) internal {
    bytes32 position = proxyOwnerPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, _newProxyOwner)
    }
    emit UpgradeabilityOwnerSet(_newProxyOwner);
  }

  /**
   * @notice Tells the address of the registry
   * @return the address of the registry
   */
  function registryAddr() public view returns (address _registry) {
    bytes32 position = registryAddrPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      _registry := sload(position)
    }
  }

  /**
   * @notice Sets the address of the registry
   * @param _registryAddress The contract registry's address
   */
  function setRegistryAddr(address _registryAddress) internal {
    bytes32 position = registryAddrPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, _registryAddress)
    }
    emit RegistryAddrSet(_registryAddress);
  }

  /**
   * @notice Sets the address of the registry via the owner
   * @param _registryAddress The contract registry's address
   */
  function changeRegistry(address _registryAddress) public onlyProxyOwner {
    setRegistryAddr(_registryAddress);
  }

  /**
   * @notice Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferProxyOwnership(address _newOwner) public onlyProxyOwner {
    require(_newOwner != address(0), "You can not give the 0 address ownership");
    emit ProxyOwnershipTransferred(proxyOwner(), _newOwner);
    setUpgradeabilityOwner(_newOwner);
  }

  /**
   * @notice Allows the proxy owner to upgrade the current version of the proxy.
   * @param _contractName The contract's name which is being upgraded
   * @param _versionName The version to upgrade to (using SemVer2.0)
   * @param _implementation representing the address of the new implementation to be set.
   */
  function upgradeTo(string _contractName, string _versionName, address _implementation) public onlyProxyOwner {
    _upgradeTo(_implementation);
    //todo register interface lookup using eip820 -- not including this now as implications are unknown
    address registry = registryAddr();
    IContractRegistry(registry).setVersion(
      _contractName,
      address(this),
      _versionName,
      _implementation
    );
    //todo require version name doesn't exits
    //todo contractName param
    emit Upgraded(_versionName, _implementation);
  }

  /**
   * @notice Allows the proxy owner to upgrade the current version of the proxy and call the new implementation
   * to initialize whatever is needed through a low level call.
   * @param _contractName The contract's name in the registry to upgrade
   * @param _versionName The version to upgrade to (using SemVer2.0)
   * @param _implementation representing the address of the new implementation to be set.
   * @param _data represents the msg.data to bet sent in the low level call. This parameter may include the function
   *        signature of the implementation to be called with the needed payload
   */
  function upgradeToAndCall(
    string _contractName,
    string _versionName,
    address _implementation,
    bytes _data
  ) public payable onlyProxyOwner {
    upgradeTo(_contractName, _versionName, _implementation);
    require(address(this).call.value(msg.value)(_data), "Upgrading and calling did not succeed"); //solium-disable-line security/no-call-value
  }
}