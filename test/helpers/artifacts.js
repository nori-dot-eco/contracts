const NoriV0 = artifacts.require('NoriV0');
const TonToken = artifacts.require('./TonToken.sol');
const EIP820Registry = artifacts.require('./EIP820Registry.sol');
const Proxy = artifacts.require('./Proxy.sol');
const UnstructuredUpgradeableTokenV0 = artifacts.require(
  './UnstructuredUpgradeableTokenV0.sol'
);
const UnstructuredOwnedUpgradeabilityProxy = artifacts.require(
  './UnstructuredOwnedUpgradeabilityProxy.sol'
);
const UnstructuredUpgradeableTokenV1 = artifacts.require(
  './UnstructuredUpgradeableTokenV1.sol'
);
const UnstructuredUpgradeableTokenV2 = artifacts.require(
  './UnstructuredUpgradeableTokenV2.sol'
);
const UnstructuredUpgradeableTokenV3 = artifacts.require(
  './UnstructuredUpgradeableTokenV3.sol'
);
const ContractRegistryV0_1_0 = artifacts.require(
  './ContractRegistryV0_1_0.sol'
);
const MultiSigWallet = artifacts.require('./MultiSigWallet.sol');
const MultiAdmin = artifacts.require('./MultiAdmin.sol');
const CRCV0 = artifacts.require('./CRCV0.sol');
const CRC = artifacts.require('./CRC.sol');
const ParticipantRegistryV0 = artifacts.require('./ParticipantRegistryV0.sol');
const ParticipantRegistry = artifacts.require('./ParticipantRegistry.sol');
const Supplier = artifacts.require('./Supplier.sol');
const SelectableCrcMarket = artifacts.require('./SelectableCrcMarket.sol');
const Participant = artifacts.require('./Participant.sol');
const Verifier = artifacts.require('./Verifier.sol');
const FifoCrcMarket = artifacts.require('./FifoCrcMarket.sol');
const EIP820Implementer = artifacts.require('./EIP820Implementer.sol');
const ParticipantV0 = artifacts.require('./ParticipantV0.sol');
const SupplierV0 = artifacts.require('./SupplierV0.sol');
const VerifierV0 = artifacts.require('./VerifierV0.sol');
const FifoCrcMarketV0 = artifacts.require('./FifoCrcMarketV0.sol');

module.exports = {
  FifoCrcMarketV0,
  VerifierV0,
  EIP820Implementer,
  FifoCrcMarket,
  Verifier,
  Participant,
  SelectableCrcMarket,
  ContractRegistryV0_1_0,
  MultiSigWallet,
  MultiAdmin,
  UnstructuredOwnedUpgradeabilityProxy,
  UnstructuredUpgradeableTokenV0,
  UnstructuredUpgradeableTokenV1,
  UnstructuredUpgradeableTokenV2,
  UnstructuredUpgradeableTokenV3,
  EIP820Registry,
  Proxy,
  NoriV0,
  TonToken,
  CRC,
  CRCV0,
  ParticipantRegistry,
  Supplier,
  SupplierV0,
  ParticipantRegistryV0,
  ParticipantV0,
};
