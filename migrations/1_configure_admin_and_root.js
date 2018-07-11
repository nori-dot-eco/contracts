/* globals artifacts web3 */
const utils = require('../test/helpers/utils');
const prepareMultiSigAndRoot = require('../test/helpers/multisig')
  .prepareMultiSigAndRoot;

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    // deploy or get the root registry, but only if the connected account has
    // permission to do so on the detected network
    let multiAdmin, multiSigWallet, rootRegistry;
    try {
      rootRegistry = await artifacts.require('./RootRegistryV0_1_0').deployed();
      [multiAdmin, multiSigWallet] = await Promise.all([
        rootRegistry.getLatestProxyAddr('MultiAdmin'),
        rootRegistry.getLatestProxyAddr('MultiSigWallet'),
      ]);
      console.log('Multisigs and root were already deployed and configured:');
    } catch (e) {
      console.log('Deploying a fresh everything!');
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
    console.log('RootRegistry', rootRegistry.address); // ropsten should be: 0x21dbe117c36acac1b3bc08a18169d8059fbce1c7
    console.log('MultiSigWallet:', multiSigWallet); // ropsten should be: 0x22c2a0758986817695d9d1a1866aacb775dc3f85
    console.log('MultiAdmin:', multiAdmin); // ropsten should be: 0x853a954591da9db7d6bb774bc8feaf7646aa5010
  });
};
