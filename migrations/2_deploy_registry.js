/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const { deployUpgradeableContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress;
    if (network === 'ropsten') {
      adminAccountAddress = accounts[0];
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const registryAddress = await ens.resolver('nori.test').addr();
      registry = await ContractRegistryV0_1_0.at(registryAddress);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
      let existingRegistry;
      try {
        existingRegistry = await ContractRegistryV0_1_0.deployed();
      } catch (e) {
        // this is OK. It just means a registry hasn't been deployed yet
      }

      if (existingRegistry) {
        console.log(
          'Found existing registry registry at',
          existingRegistry.address
        );
        registry = ContractRegistryV0_1_0.at(
          await existingRegistry.getLatestProxyAddr.call('ContractRegistry')
        );
      } else {
        const contractRegistrysRegistry = await deployer.deploy(
          ContractRegistryV0_1_0
        );
        // Deploy the registry behind a proxy
        [, , registry] = await deployUpgradeableContract(
          artifacts,
          null,
          ContractRegistryV0_1_0,
          contractRegistrysRegistry,
          [['address'], [adminAccountAddress]],
          { from: adminAccountAddress }
        );
      }
    }

    console.log('Deployed Registry Address:', registry.address);
  });
};
