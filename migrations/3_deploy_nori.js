/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const { upgradeToContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const NoriV0_1_0 = artifacts.require('NoriV0_1_0');
const ParticipantRegistryV0_1_0 = artifacts.require(
  'ParticipantRegistryV0_1_0'
);
const CRCV0_1_0 = artifacts.require('CRCV0_1_0');
const ParticipantV0_1_0 = artifacts.require('ParticipantV0_1_0');
const SupplierV0_1_0 = artifacts.require('SupplierV0_1_0');
const VerifierV0_1_0 = artifacts.require('VerifierV0_1_0');
const FifoCrcMarketV0_1_0 = artifacts.require('FifoCrcMarketV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress;
    if (network === 'ropsten' || network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const registryAddress = await ens.resolver('nori.test').addr();
      registry = await ContractRegistryV0_1_0.at(registryAddress);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
      const rootRegistry = await RootRegistryV0_1_0.deployed();
      registry = ContractRegistryV0_1_0.at(
        await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
      );
    }

    const upgrade = (contract, argTypes, args) =>
      upgradeToContract(artifacts, contract, registry, argTypes, args, {
        from: adminAccountAddress,
      });

    console.log('Deployed Registry Address:', registry.address);

    const nori = await upgrade(
      NoriV0_1_0,
      ['string', 'string', 'uint', 'uint', 'address', 'address'],
      [
        'Upgradeable NORI Token',
        'NORI',
        1,
        0,
        registry.address,
        adminAccountAddress,
      ]
    );

    const participantRegistry = await upgrade(
      ParticipantRegistryV0_1_0,
      ['address', 'address'],
      [registry.address, adminAccountAddress]
    );

    const crc = await upgrade(
      CRCV0_1_0,
      ['string', 'string', 'address', 'address', 'address'],
      [
        'Carbon Removal Certificate',
        'CRC',
        registry.address,
        participantRegistry.address,
        adminAccountAddress,
      ]
    );

    await upgrade(
      ParticipantV0_1_0,
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, adminAccountAddress]
    );

    await upgrade(
      SupplierV0_1_0,
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, adminAccountAddress]
    );

    await upgrade(
      VerifierV0_1_0,
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, adminAccountAddress]
    );

    await upgrade(
      FifoCrcMarketV0_1_0,
      ['address', 'address[]', 'address'],
      [registry.address, [crc.address, nori.address], adminAccountAddress]
    );
  });
};
