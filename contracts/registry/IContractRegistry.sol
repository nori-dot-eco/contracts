pragma solidity ^0.4.24;

interface IContractRegistry {
  function setVersion(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
    ) public;
  function setVersionAsAdmin(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
    ) public;
  function getVersionCountForContract(string contractName, address proxyAddress) public view returns(uint);
  function getLatestProxyAddr(string contractName) public view returns (address);
  function getContractInfoForVersion(string _contractName, string _versionName) public view returns (uint256, string, address, address);
  function initialized() public view returns(bool);
  function getVersionForContractName(string contractName, int index) public view returns (string, address, address);
  function getContractNameAndHashAtProxy(address _proxyAddress) public view returns (string, bytes32);
}