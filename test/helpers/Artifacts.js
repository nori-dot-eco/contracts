const Artifacts = {};
[
  'NoriV0',
  'EIP820Registry',
  'Proxy',
  'UnstructuredUpgradeableTokenV0',
  'UnstructuredOwnedUpgradeabilityProxy',
  'UnstructuredUpgradeableTokenV1',
  'UnstructuredUpgradeableTokenV2',
  'UnstructuredUpgradeableTokenV3',
  'ContractRegistryV0_1_0',
  'MultiSigWallet',
  'MultiAdmin',
  'CRCV0',
  'CRC',
  'ParticipantRegistryV0',
  'ParticipantRegistry',
  'Supplier',
  'Participant',
  'Verifier',
  'EIP820Implementer',
  'ParticipantV0',
  'SupplierV0',
  'VerifierV0',
  'FifoCrcMarketV0',
].forEach(contractName => {
  Artifacts[contractName] = artifacts.require(contractName);
});

module.exports = Artifacts;
