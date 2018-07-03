/* globals artifacts */
const Artifacts = {};
[
  'NoriV0_1_0',
  'EIP820Registry',
  'Proxy',
  'UnstructuredUpgradeableTokenV0',
  'UnstructuredOwnedUpgradeabilityProxy',
  'UnstructuredUpgradeableTokenV1',
  'UnstructuredUpgradeableTokenV2',
  'UnstructuredUpgradeableTokenV3',
  'ContractRegistryV0_1_0',
  'SelectableCrcMarketV0_1_0',
  'MultiSigWallet',
  'MultiAdmin',
  'CRCV0_1_0',
  'ParticipantRegistryV0_1_0',
  'EIP820Implementer',
  'ParticipantV0_1_0',
  'SupplierV0_1_0',
  'VerifierV0_1_0',
  'FifoCrcMarketV0_1_0',
  'RootRegistryV0_1_0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
