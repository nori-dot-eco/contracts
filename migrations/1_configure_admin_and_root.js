/* globals artifacts web3 */
/* eslint-disable no-unused-expressions */
const utils = require('../test/helpers/utils');
const { getLatestVersionFromFs } = require('../test/helpers/contracts');
const prepareMultiSigAndRoot = require('../test/helpers/multisig')
  .prepareMultiSigAndRoot;

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    // deploy or get the root registry, but only if the connected account has
    // permission to do so on the detected network
    let multiAdmin, multiSigWallet, rootRegistry;
    try {
      rootRegistry = await artifacts
        .require(
          `./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`
        )
        .deployed();
      [multiAdmin, multiSigWallet] = await Promise.all([
        rootRegistry.getLatestProxyAddr('MultiAdmin'),
        rootRegistry.getLatestProxyAddr('MultiSigWallet'),
      ]);
      process.env.MIGRATION &&
        console.log('Multisigs and root were already deployed and configured:');
    } catch (e) {
      process.env.MIGRATION && console.log('Deploying a fresh everything!');
      ({
        multiAdmin,
        multiSigWallet,
        rootRegistry,
      } = await utils.onlyWhitelisted(
        {
          network,
          artifacts,
          web3,
          accounts,
          deployer,
        },
        prepareMultiSigAndRoot
      ));
    }
    process.env.MIGRATION && console.log('RootRegistry', rootRegistry.address); // ropsten should be: 0x4dcff1a5c3c85bf232505b9007eb2a679e4ee582
    process.env.MIGRATION &&
      console.log('MultiSigWallet:', multiSigWallet.address); // ropsten should be: 0x22c2a0758986817695d9d1a1866aacb775dc3f85
    process.env.MIGRATION && console.log('MultiAdmin:', multiAdmin.address); // ropsten should be: 0x853a954591da9db7d6bb774bc8feaf7646aa5010
  });
};
