pragma solidity ^0.4.24;


/// @title VersionRegistry
/// @dev keeps track of the latest version of all contracts
contract VersionRegistry {

  event VersionSet(string contractName, address proxyAddress, string versionName, address newImplementation);

  mapping(bytes32 => address) private proxyContracts;
  mapping(bytes32 => mapping(address => Version[])) public versions;

  struct Version {
    string versionName;
    address implementation;
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
