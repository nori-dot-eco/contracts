/* globals artifacts web3 */
const {
  upgradeAndTransferToMultiAdmin,
  deployOrGetRootRegistry,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const utils = require('../test/helpers/utils');
const prepareMultiSigAndRoot = require('../test/helpers/multisig')
  .prepareMultiSigAndRoot;

const MultiAdmin = artifacts.require('MultiAdmin');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let root, adminAccountAddress, multiAdmin, registry;
    const config = {
      network,
      artifacts,
      web3,
      accounts,
      deployer,
    };

    if (network === 'ropsten' || network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      const { multiAdminAddr, rootRegistry } = await utils.onlyWhitelisted(
        config,
        prepareMultiSigAndRoot
      );
      if ((await rootRegistry.owner()) !== multiAdminAddr) {
        throw new Error(
          'Root registry owner should be the multisig admin account'
        );
      }
      // todo just return admin during setup?
      multiAdmin = await MultiAdmin.at(multiAdminAddr);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
      try {
        root = await deployOrGetRootRegistry(config);
        multiAdmin = MultiAdmin.at(
          await root.getLatestProxyAddr.call('MultiAdmin')
        );
      } catch (e) {
        throw new Error(
          'Something went wrong. A root registry and admin should have been configured in a previous migration'
        );
      }
      // Deploy the registry behind a proxy
      const upgradeRegistry = () =>
        upgradeAndTransferToMultiAdmin(
          config,
          'ContractRegistry',
          root,
          [['address'], [multiAdmin.address]],
          { from: adminAccountAddress },
          multiAdmin
        );
      ({ registry } = await utils.onlyWhitelisted(config, upgradeRegistry));
    }

    console.log('Deployed Registry Address:', registry.address);
  });
};
