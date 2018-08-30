pragma solidity ^0.4.24;

interface IContractRegistry {
  function setVersion(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
    ) external;
  function setVersionAsAdmin(
    string contractName,
    address proxyAddress,
    string versionName,
    address newImplementation
    ) external;
  function getVersionCountForContract(string contractName, address proxyAddress) external view returns(uint);
  function getLatestProxyAddr(string contractName) external view returns (address);
  function getContractInfoForVersion(string _contractName, string _versionName) external view returns (uint256, string, address, address);
  function initialized() external view returns(bool);
  function getVersionForContractName(string contractName, int index) external view returns (string, address, address);
  function getContractNameAndHashAtProxy(address _proxyAddress) external view returns (string, bytes32);
}