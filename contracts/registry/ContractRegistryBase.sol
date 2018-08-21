pragma solidity ^0.4.24;
//import "../EIP820/EIP820Registry.sol";
//import "../EIP820/IEIP820Registry.sol";
import "../ownership/UnstructuredOwnable.sol";
import "./IContractRegistry.sol";


/// @title ContractRegistryBase
/// @dev defines the base registry function sets for future versions to inherit from
contract ContractRegistryBase is UnstructuredOwnable, IContractRegistry {
  //todo does UnstructuredOwnable inheritance position matter? --^

  event Initialized(address owner);
  event VersionSet(string contractName, address proxyAddress, string versionName, address newImplementation);

  bool private _initialized;
  address public proxyAddr;
  mapping(bytes32 => address) private proxyContracts;
  mapping(bytes32 => mapping(address => Version[])) public versions;
  struct Version {
    string versionName;
    address implementation;
  }

  //todo onlyowner?
  function initialize(address owner) public {
    require(_initialized != true, "You can only initialize this contract once.");
    //todo register interfaces using eip820
    setOwner(owner);
    _initialized = true;
    emit Initialized(owner);
  }

  /**
    @dev returns the current initalization status
  */
  function initialized() public view returns(bool) {
    return _initialized;
  }


  //todo BEFORE LAUNCH: onlyOwner! <-- needs to be the addr of the proxy as thats the one who sends the tx
  function setVersion(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
  ) public {
    _setVersion(
      contractName,
      proxyAddress,
      versionName,
      newImplementation
    );
  }

  /// @notice Gets the address of the latest proxt contract of a particular name
  /// @param _contractName String name of a contract (ie Registry)
  function getLatestProxyAddr(string _contractName) public view returns (address) {
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    return proxyContracts[contractName];
  }

  //todo create a function for getting count of versiuons for a particular contract name
  //todo create a function that gets a contract proxy for a particular version name

  function _setVersion(
    string _contractName,
    address _proxyAddress,
    string _versionName,
    address _newImplementation
  ) internal {
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractName][_proxyAddress];
    history.push(Version(_versionName, _newImplementation));
    proxyContracts[contractName] = _proxyAddress;
    emit VersionSet(
      _contractName,
      _proxyAddress,
      _versionName,
      _newImplementation
    );
  }

  /// @dev pass -1 to get the latest, or a particular index to get a certain one
  function getVersionForContractName(string _contractName, int _index) public view returns (string, address, address) {
    uint index;
    address latestProxy = getLatestProxyAddr(_contractName);
    bytes32 contractName = keccak256(abi.encodePacked(_contractName));
    Version[] storage history = versions[contractName][latestProxy];
    if(_index < 0) {
      index = history.length-1;
    }
    else {
      index = uint(_index);
    }
    Version storage latest = history[index];
    return (latest.versionName, latest.implementation, latestProxy);
  }

}
