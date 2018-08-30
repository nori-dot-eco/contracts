pragma solidity ^0.4.24;
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
      msg.sender == getLatestProxyAddr(_contractName),
      "Only the proxy can call this function"
    );
    _;
  }

  //todo onlyowner?
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
    _initialized = true;
    emit Initialized(_owner);
  }

  /**
    @notice returns the current initialization status
    @return a boolean state representing wether or not the contract
            has been initialized yet
  */
  function initialized() public view returns(bool) {
    return _initialized;
  }

  /**
    @notice Gets the address of the latest proxy contract of a particular name
    @param _contractName String name of a contract (ie Registry)
    @return the address of the latest proxy for the provided contract name
  */
  function getLatestProxyAddr(string _contractName) public view returns (address) {
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    return contractNameHashToProxy[contractName];
  }

  /**
    @notice Gets a contract name and contract name's hash at a given proxy address
    @param _proxyAddress The address of a particular proxy
    @return the contract name and name hash in use at the given proxy address
  */
  function getContractNameAndHashAtProxy(address _proxyAddress) public view returns (string, bytes32) {
    return (proxyToContractName[_proxyAddress].name, proxyToContractName[_proxyAddress].nameHash);
  }

  /**
    @notice  Gets the number of Versions for a particular ContractName at a particular proxy address
    @param _contractName String name of a contract (i.e. CRC)
    @param _proxyAddress The address os a particular Proxy used by the given contract name
    @return the count of version existing for the provided contract name and proxy
  */
  function getVersionCountForContract(string _contractName, address _proxyAddress) public view returns(uint) {
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
  function getContractInfoForVersion(string _contractName, string _versionName) public view returns (uint256, string, address) {
    address latestProxy = getLatestProxyAddr(_contractName);
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractName][latestProxy];
    for(uint256 proxyIndex = 0; proxyIndex < history.length; proxyIndex.add(1)) {
      for(uint256 impIndex = 0; impIndex < history.length; impIndex.add(1)) {
        if(keccak256(abi.encodePacked(history[impIndex].versionName)) == keccak256(abi.encodePacked(_versionName))) {
          Version storage latest = history[impIndex];
          return (latest.index, latest.versionName, latest.implementation);
        }
      }
    }
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
  ) public onlyProxy(_contractName) {
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
    @dev This function can only be used by the admin.
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
  ) public onlyOwner {
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
      "You must use a and a non-empty string as the version name"
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
    if (contractNameHashToProxy[contractNameHash] != _proxyAddress){
      registeredContractCount.add(1);
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
  function getVersionForContractName(string _contractName, int _index) public view returns (string, address, address) {
    uint index;
    address latestProxy = getLatestProxyAddr(_contractName);
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
