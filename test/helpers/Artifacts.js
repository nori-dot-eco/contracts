/* globals artifacts */
const Artifacts = {};
[
  'NoriV0_1_1',
  'EIP820Registry',
  'Proxy',
  'UnstructuredUpgradeableTokenV0',
  'UnstructuredOwnedUpgradeabilityProxy',
  'UnstructuredUpgradeableTokenV1',
  'UnstructuredUpgradeableTokenV2',
  'UnstructuredUpgradeableTokenV3',
  'ContractRegistryV0_2_0',
  'MultiSigWallet',
  'MultiAdmin',
  'CRCV0_2_2',
  'ParticipantRegistryV0_1_1',
  'EIP820Implementer',
  'FifoCrcMarketV0_1_2',
  'RootRegistryV0_2_0',
  'SelectableCrcMarketV0_1_0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
