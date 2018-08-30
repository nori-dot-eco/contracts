/* globals artifacts */
const Artifacts = {};
[
  'NoriV0_2_0',
  'Proxy',
  'UnstructuredUpgradeableTokenV0_1_0',
  'UnstructuredOwnedUpgradeabilityProxy',
  'UnstructuredUpgradeableTokenV0_2_0',
  'UnstructuredUpgradeableTokenV0_3_0',
  'UnstructuredUpgradeableTokenV0_4_0',
  'ContractRegistryV0_3_0',
  'MultiSigWallet',
  'MultiAdmin',
  'CRCV0_3_0',
  'ParticipantRegistryV0_2_0',
  'FifoCrcMarketV0_2_0',
  'RootRegistryV0_2_0',
  'SelectableCrcMarketV0_1_0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
