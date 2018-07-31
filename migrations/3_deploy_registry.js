/* globals artifacts web3 */
const {
  upgradeAndTransferToMultiAdmin,
  deployOrGetRootRegistry,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const utils = require('../test/helpers/utils');

const MultiAdmin = artifacts.require('MultiAdmin');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let root, adminAccountAddress, multiAdmin;
    const config = {
      network,
      artifacts,
      web3,
      accounts,
      deployer,
    };
    if (network === 'ropsten' || network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
    }

    try {
      root = await deployOrGetRootRegistry(config);
      multiAdmin = await MultiAdmin.at(
        await root.getLatestProxyAddr.call('MultiAdmin')
      );
    } catch (e) {
      throw new Error(
        'Something went wrong. A root registry and admin should have been configured in a previous migration'
      );
    }

    const upgradeRegistry = () =>
      upgradeAndTransferToMultiAdmin(
        config.artifacts,
        'ContractRegistry',
        root,
        [['address'], [multiAdmin.address]],
        { from: adminAccountAddress },
        multiAdmin
      );

    const { proxy } = await utils.onlyWhitelisted(config, upgradeRegistry);
    if ((await root.owner()) !== multiAdmin.address) {
      throw new Error(
        'Root registry owner should be the multisig admin account'
      );
    }
    console.log(
      'Current Deployed ContractRegistry Proxy Address:',
      proxy.address || proxy
    );
  });
};
