/* globals artifacts */
const Artifacts = {};
[
  'NoriV0_1_2',
  'Proxy',
  'UnstructuredUpgradeableTokenV0',
  'UnstructuredOwnedUpgradeabilityProxy',
  'UnstructuredUpgradeableTokenV1',
  'UnstructuredUpgradeableTokenV2',
  'UnstructuredUpgradeableTokenV3',
  'ContractRegistryV0_2_1',
  'MultiSigWallet',
  'MultiAdmin',
  'CRCV0_2_3',
  'ParticipantRegistryV0_1_2',
  'FifoCrcMarketV0_1_3',
  'RootRegistryV0_2_0',
  'SelectableCrcMarketV0_1_0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
