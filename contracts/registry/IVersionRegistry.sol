pragma solidity ^0.4.24;

contract IVersionRegistry {
  function setVersion(string contractName, address proxyAddress, string versionName, address newImplementation) public;
}