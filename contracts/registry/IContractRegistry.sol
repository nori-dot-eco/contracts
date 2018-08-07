pragma solidity ^0.4.24;

interface IContractRegistry {
  function setVersion(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
    ) public;

  function getLatestProxyAddr(string contractName) public view returns (address);
  function getVersionForContractName(string _contractName, int _index) public view returns (string, address, address);
}