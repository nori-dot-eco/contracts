/* globals artifacts */

const CRCV0 = artifacts.require('./CRCV0.sol');
const NoriV0 = artifacts.require('./NoriV0.sol');
const FifoCrcMarketV0_1_0 = artifacts.require('./FifoCrcMarketV0_1_0.sol');
const EIP820Implementer = artifacts.require('./EIP820Implementer.sol');
const EIP820Registry = artifacts.require('./EIP820Registry.sol');
const ParticipantRegistry = artifacts.require('./ParticipantRegistry.sol');
const MultiSigWallet = artifacts.require('./MultiSigWallet.sol');
const ParticipantRegistryV0 = artifacts.require('./ParticipantRegistryV0');
const ParticipantV0_1_0 = artifacts.require('./ParticipantV0_1_0');
const SupplierV0_1_0 = artifacts.require('./SupplierV0_1_0.sol');
const VerifierV0_1_0 = artifacts.require('./VerifierV0_1_0.sol');
const ContractRegistryV0_1_0 = artifacts.require(
  './ContractRegistryV0_1_0.sol'
);
const RootRegistryV0_1_0 = artifacts.require('./RootRegistryV0_1_0.sol');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(EIP820Registry);
    await deployer.deploy(ContractRegistryV0_1_0);
    await deployer.deploy(RootRegistryV0_1_0);

    // Is this needed since CRC and TON construct their own EIP 820 implementers?
    await deployer.deploy(EIP820Implementer, ContractRegistryV0_1_0.address);

    await deployer.deploy(ParticipantRegistry, ContractRegistryV0_1_0.address);

    await deployer.deploy(ParticipantRegistryV0);
    await deployer.deploy(ParticipantV0_1_0);

    await deployer.deploy(SupplierV0_1_0);

    await deployer.deploy(VerifierV0_1_0);

    await deployer.deploy(CRCV0);
    await deployer.deploy(NoriV0);

    await deployer.deploy(FifoCrcMarketV0_1_0);

    // todo only deploy this  to main net with nori mainnet addresses as owners
    await deployer.deploy(
      MultiSigWallet,
      [0x1d75abdf70d84e3bec66d3ce60145dddca3bcc06],
      web3.toBigNumber(1),
      ContractRegistryV0_1_0.address
    );
  });
};
