pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2; //solium-disable-line

import "../lifecycle/Pausable.sol";
import "./IContractRegistry.sol";
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";


/**
  @title ContractRegistryBase: this contract defines the base registry
         function sets for setting and retrieving upgrade info and the
         current proxy addresses.
*/
contract ContractRegistryBase is Pausable, IContractRegistry, ERC820Implementer {
  //todo does Pausable inheritance position matter for upgrades (in that, do variables need to be laid out in a particular order in upgraded versions)? --^

  using SafeMath for uint256;

  /**
  * @notice Used to broadcast that this contract has been initialized
  * @param owner representing the address of the contract owner
  */
  event Initialized(address owner);
  /**
  * @notice Used to broadcast that a new contract version has been set
  * @param contractName representing the name of the contract which received a
  *        new version
  * @param proxyAddress the proxy which maintains the contract's state
  * @param versionName the name of the version set (using SemVer 2.0)
  */
  event VersionSet(string contractName, address indexed proxyAddress, string versionName, address newImplementation);

  bool private _initialized;
  uint256 public registeredContractCount;
  mapping(bytes32 => address) private contractNameHashToProxy;
  mapping(address => ContractNameAndHash) private proxyToContractName;
  mapping(bytes32 => mapping(address => Version[])) public versions;
  struct Version {
    uint256 index;
    string versionName;
    address implementation;
  }
  struct ContractNameAndHash {
    string name;
    bytes32 nameHash;
  }

  /**
    @notice Throws if called by any account other than the owner or proxy
    @param _contractName The name of the contract used to look up the
           current proxy address for
  */
  modifier onlyProxy(string _contractName) {
    require(
      msg.sender == _getLatestProxyAddr(_contractName),
      "Only the proxy can call this function"
    );
    _;
  }

  //todo onlyOwner: Depends on Trello ticket #514: deploy contracts from MultiAdmin
  /**
    @notice The contract initializer
    @dev Always use this function to set the contract state after constructing since when using
         an upgradeable proxy mechanism, state set inside the constructor will not persist to the
         proxy.
    @param _owner The owner of the contract
  */
  function initialize(address _owner) public {
    require(_initialized != true, "You can only initialize this contract once.");
    owner = _owner;
    registeredContractCount = 0;
    _initialized = true;
    emit Initialized(_owner);
  }

  /**
    @notice returns the current initialization status
    @return a boolean state representing wether or not the contract
            has been initialized yet
  */
  function initialized() external view returns(bool) {
    return _initialized;
  }

  /**
    @notice Gets the address of the latest proxy contract of a particular name.
    @dev Internally invokes _getLatestProxyAddr
    @param _contractName String name of a contract (ie Registry)
    @return the address of the latest proxy for the provided contract name
  */
  function getLatestProxyAddr(string _contractName) external view returns (address) {
    return _getLatestProxyAddr(_contractName);
  }

  /**
    @notice Used privately to get the address of the latest proxy contract of a particular name
    @param _contractName String name of a contract (ie Registry)
    @return the address of the latest proxy for the provided contract name
  */
  function _getLatestProxyAddr(string _contractName) private view returns (address) {
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    return contractNameHashToProxy[contractName];
  }

  /**
    @notice Gets a contract name and contract name's hash at a given proxy address
    @param _proxyAddress The address of a particular proxy
    @return the contract name and name hash in use at the given proxy address
  */
  function getContractNameAndHashAtProxy(address _proxyAddress) external view returns (string, bytes32) {
    return (proxyToContractName[_proxyAddress].name, proxyToContractName[_proxyAddress].nameHash);
  }

  /**
    @notice  Gets the number of Versions for a particular ContractName at a particular proxy address
    @param _contractName String name of a contract (i.e. CRC)
    @param _proxyAddress The address os a particular Proxy used by the given contract name
    @return the count of version existing for the provided contract name and proxy
  */
  function getVersionCountForContract(string _contractName, address _proxyAddress) external view returns(uint) {
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractName][_proxyAddress];
    return history.length;
  }

  /**
    @notice Gets a contract version info for a particular contract name and proxy using the version name
    @dev This function will loop through the entire history of a particular contract starting with the earliest proxy history.
    @param _contractName String name of a contract (i.e. CRC)
    @param _versionName The name of a particular version you are looking for (using SemVer 2.0, i.e. '0.2.0')
    @return The index at which the given contract exists, the name of the version, the logic implementation, and the address
            of the proxy used by this versions parent
  */
  function getContractInfoForVersion(string _contractName, string _versionName) external view returns (uint256, string, address, address) {
    address latestProxy = _getLatestProxyAddr(_contractName);
    bytes32 contractNameHash = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractNameHash][latestProxy];
    for(uint256 i = 0; i < history.length; i = i.add(1)) {
      if(keccak256(abi.encodePacked(history[i].versionName)) == keccak256(abi.encodePacked(_versionName))) {
        Version storage latest = history[i];
        return (latest.index, latest.versionName, latest.implementation, latestProxy);
      }
    }
  }

  /**
    @notice Returns the entire history for a given contract name
    @param _contractName String name of a contract (i.e. CRC)
    @return Will return the history as the Version struct within an array
  */
  function getVersionHistoryForContractName(string _contractName) external view returns(Version[]){
    address latestProxy = _getLatestProxyAddr(_contractName);
    bytes32 contractNameHash = keccak256(abi.encodePacked(_contractName));
    return versions[contractNameHash][latestProxy];
  }

  /**
    @notice Sets a version for a particular contract by assigning a contract name an associated
            proxy, version name (using SemVer 2.0) and its logic implementation
    @dev This function can only be used by a particular contract's proxy.
    @param _contractName String name of a contract (ie Registry)
    @param _proxyAddress the Proxy contract's address
    @param _versionName the version name (which MUST be incremented each time new logic is set) using SemVer 2.0
    @param _newImplementation the contract containing the logic of the proposed contract name
  */
  function setVersion(
    string _contractName,
    address _proxyAddress,
    string _versionName,
    address _newImplementation
  ) external onlyProxy(_contractName) {
    require(
      _proxyAddress != address(0),
      "You cannot use the 0 address for the proxy"
    );
    require(
      _newImplementation != address(0),
      "You cannot use the 0 address for the implementation"
    );
    require(
      bytes(_contractName).length > 0,
      "You must use a non-empty string as the contract name"
    );
    _setVersion(
      _contractName,
      _proxyAddress,
      _versionName,
      _newImplementation
    );
  }

  /**
    @notice Sets a version for a particular contract by assigning a contract name an associated
            proxy, version name (using SemVer 2.0) and its logic implementation
    @dev This function can only be used by the admin. Additionally, it is not recomended
         to ever use this function unless you truly understand the implications it has inside the proxy contract
         and this registry alike. In most cases, the only appropriate time to use this function
         is during the very first registration of a contract at a proxy. In all other cases, the
         `setVersion` function should be called directly from the proxy's `upgradeTo` or `upgradeToAndCall`
         function (both of which will not work until this function was used during the FIRST deployment/registration
         of the proxy).
    @param _contractName String name of a contract (ie Registry)
    @param _proxyAddress the Proxy contract's address
    @param _versionName the version name (which MUST be incremented each time new logic is set) using SemVer 2.0
    @param _newImplementation the contract containing the logic of the proposed contract name
  */
  function setVersionAsAdmin(
    string _contractName,
    address _proxyAddress,
    string _versionName,
    address _newImplementation
  ) external onlyOwner {
    _setVersion(
      _contractName,
      _proxyAddress,
      _versionName,
      _newImplementation
    );
  }

  /**
    @notice This function is used privately by setVersionAsAdmin and setVersion
    @dev This function can only be used by the admin.
    @param _contractName String name of a contract (ie Registry)
    @param _proxyAddress the Proxy contract's address
    @param _versionName the version name (which MUST be incremented each time new logic is set) using SemVer 2.0
    @param _newImplementation the contract containing the logic of the proposed contract name
  */
  function _setVersion(
    string _contractName,
    address _proxyAddress,
    string _versionName,
    address _newImplementation
  ) private {
    require(
      bytes(_versionName).length > 0,
      "You must use a non-empty string as the version name"
    );
    bytes32 contractNameHash = keccak256(abi.encodePacked(_contractName));
    require(
      proxyToContractName[_proxyAddress].nameHash == contractNameHash || proxyToContractName[_proxyAddress].nameHash == "",
      "You can only re-use proxy addresses if the proposed contact uses the same contract name"
    );
    Version[] storage history = versions[contractNameHash][_proxyAddress];
    history.push(
      Version(
        history.length,
        _versionName,
        _newImplementation
      )
    );
    if (contractNameHashToProxy[contractNameHash] != _proxyAddress) {
      registeredContractCount = registeredContractCount.add(1);
    }
    contractNameHashToProxy[contractNameHash] = _proxyAddress;
    proxyToContractName[_proxyAddress] = ContractNameAndHash(_contractName, contractNameHash);
    emit VersionSet(
      _contractName,
      _proxyAddress,
      _versionName,
      _newImplementation
    );
  }

  /**
    @notice Sets a version for a particular contract by assigning a contract name an associated
            proxy, version name (using SemVer 2.0) and its logic implementation
    @param _contractName String name of a contract (ie Registry)
    @param _index the proxy contract's positional index inside of 'versions'.
           Pass -1 to get the latest proxy's history (in most cases, you should default to this),
           or a particular index to get the particular history for a given index. Note:
           The first index (0) is only used pre-initialization and is not a valid version (0_0_0)
           nor implementation address (0x0). If you want the earliest index, pass: _index = 1
    @return The version name, the logic implementation, and the latest proxy address
  */
  function getVersionForContractName(string _contractName, int _index) external view returns (string, address, address) {
    uint index;
    address latestProxy = _getLatestProxyAddr(_contractName);
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractName][latestProxy];
    if(_index < 0) {
      index = history.length.sub(1);
    }
    else {
      index = uint(_index);
    }
    Version storage latest = history[index];
    return (latest.versionName, latest.implementation, latestProxy);
  }

}
