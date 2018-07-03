/* globals artifacts */
const Artifacts = {};
[
  'NoriV0',
  'TonToken',
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
  'CRCV0',
  'ParticipantRegistryV0',
  'ParticipantRegistry',
  'Participant',
  'Verifier',
  'FifoCrcMarket',
  'EIP820Implementer',
  'ParticipantV0',
  'SupplierV0',
  'VerifierV0',
  'FifoCrcMarketV0',
  'RootRegistryV0_1_0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
