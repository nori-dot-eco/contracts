/* globals artifacts */

const CRC = artifacts.require('./CRC.sol');
const TonToken = artifacts.require('./TonToken.sol');
const SelectableCrcMarket = artifacts.require('./SelectableCrcMarket.sol');
const FifoCrcMarket = artifacts.require('./FifoCrcMarket.sol');
const FifoCrcMarketV0 = artifacts.require('./FifoCrcMarketV0.sol');
const EIP820Implementer = artifacts.require('./EIP820Implementer.sol');
const EIP820Registry = artifacts.require('./EIP820Registry.sol');
const ParticipantRegistry = artifacts.require('./ParticipantRegistry.sol');
const Supplier = artifacts.require('./Supplier.sol');
const Participant = artifacts.require('./Participant.sol');
const Verifier = artifacts.require('./Verifier.sol');
const MultiSigWallet = artifacts.require('./MultiSigWallet.sol');
const ParticipantRegistryV0 = artifacts.require('./ParticipantRegistryV0');
const ParticipantV0 = artifacts.require('./ParticipantV0');
const SupplierV0 = artifacts.require('./SupplierV0.sol');
const VerifierV0 = artifacts.require('./VerifierV0.sol');
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
    await deployer.deploy(ParticipantV0);

    await deployer.deploy(
      Supplier,
      ParticipantRegistry.address,
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(SupplierV0);

    await deployer.deploy(
      Verifier,
      ParticipantRegistry.address,
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(VerifierV0);

    await deployer.deploy(
      Participant,
      ParticipantRegistry.address,
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(
      CRC,
      'Carbon Removal Certificate',
      'CRC',
      ContractRegistryV0_1_0.address,
      ParticipantRegistry.address
    );
    await deployer.deploy(
      TonToken,
      'NORI Token',
      'NORI',
      1,
      0,
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(
      SelectableCrcMarket,
      [CRC.address, TonToken.address],
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(
      FifoCrcMarket,
      [CRC.address, TonToken.address],
      ContractRegistryV0_1_0.address
    );
    await deployer.deploy(FifoCrcMarketV0);

    // todo only deploy this  to main net with nori mainnet addresses as owners
    await deployer.deploy(
      MultiSigWallet,
      [0x1d75abdf70d84e3bec66d3ce60145dddca3bcc06],
      web3.toBigNumber(1),
      ContractRegistryV0_1_0.address
    );
  });
};
