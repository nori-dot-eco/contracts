/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const { deployUpgradeableContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress;
    if (network === 'ropsten') {
      adminAccountAddress = accounts[0];
      if (
        ![
          '0xf1bcd758cb3d46d15afe4faef942adad36380148',
          '0x2e4d8353d81b7e903c9e031dab3e9749e8ab69bc',
        ].includes(adminAccountAddress.toLowerCase())
      ) {
        throw new Error(
          `${
            adminAccountAddress
          } is not a whitelisted account for deploying to ropsten.`
        );
      }
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const registryAddress = await ens.resolver('nori.test').addr();
      registry = await ContractRegistryV0_1_0.at(registryAddress);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
      let existingRegistry;
      try {
        existingRegistry = await RootRegistryV0_1_0.deployed();
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
        const rootRegistry = await deployer.deploy(RootRegistryV0_1_0);
        // Deploy the registry behind a proxy
        [, , registry] = await deployUpgradeableContract(
          artifacts,
          null,
          ContractRegistryV0_1_0,
          rootRegistry,
          [['address'], [adminAccountAddress]],
          { from: adminAccountAddress }
        );
      }
    }

    console.log('Deployed Registry Address:', registry.address);
  });
};
