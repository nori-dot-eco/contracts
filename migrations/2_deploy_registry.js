/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const { deployUpgradeableContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress, rootRegistry;

    /**
     * NOTE: THE FOLLOWING WILL CONFORM TO DIFFERENT LOGIC IN SUBSEQUENT PRS.
     *  SO DONT REVIEW MIGRATIONS STARTING FROM HERE ON.
     * EASIEST TO JUST RE-ENABLE THESE IN SUBSEQUENT PRs FOR
     * EASIER REVIEW AS I WEAVE IN MY CHANGES FROM THE WEEKEND
     */

    if (network === 'ropsten' || network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      if (
        ![
          '0xf1bcd758cb3d46d15afe4faef942adad36380148',
          '0x2e4d8353d81b7e903c9e031dab3e9749e8ab69bc',
        ].includes(adminAccountAddress.toLowerCase())
      ) {
        throw new Error(
          `${adminAccountAddress} is not a whitelisted account for deploying to ropsten.`
        );
      }
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const registryAddress = await ens.resolver('nori.test').addr();
      registry = await ContractRegistryV0_1_0.at(registryAddress);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;

      try {
        rootRegistry = await RootRegistryV0_1_0.deployed();
      } catch (e) {
        throw new Error(
          'Something went wrong. A root registry should have been configured in a previous migration'
        );
      }

      console.log('Found existing contract registry at', rootRegistry.address);
      registry = ContractRegistryV0_1_0.at(
        await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
      );

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

    console.log('Deployed Registry Address:', registry.address);
  });
};
