const deployOrGetRootRegistry = require('./contracts').deployOrGetRootRegistry;

const prepareMultiSigAndRoot = async config => {
  const { network, artifacts, web3, accounts, deployer } = config;
  const admin0 = accounts[0];
  const admin1 = accounts[1];
  let multiAdmin, multiSigWallet, rootRegistry;

  if (network === 'ropsten' || network === 'ropstenGeth') {
    try {
      rootRegistry = await deployOrGetRootRegistry({
        network,
        artifacts,
        web3,
        deployer,
      });
      [multiAdmin, multiSigWallet] = await Promise.all([
        rootRegistry.getLatestProxyAddr('MultiAdmin'),
        rootRegistry.getLatestProxyAddr('MultiSigWallet'),
      ]);
    } catch (e) {
      throw new Error('MultiSigs havent been deployed');
    }
  } else if (network === 'develop') {
    rootRegistry = await deployer.deploy(
      artifacts.require('RootRegistryV0_1_0')
    );
    [multiSigWallet, multiAdmin] = await Promise.all([
      artifacts
        .require('MultiSigWallet')
        .new([admin0, admin1], 1, rootRegistry.address),
      artifacts
        .require('MultiAdmin')
        .new([admin0, admin1], 1, rootRegistry.address),
    ]);

    await rootRegistry.setVersion(
      'MultiAdmin',
      multiAdmin.address,
      '0_1_0',
      multiAdmin.address
    );
    await rootRegistry.setVersion(
      'MultiSigWallet',
      multiSigWallet.address,
      '0_1_0',
      multiSigWallet.address
    );

    [multiAdmin, multiSigWallet] = await Promise.all([
      rootRegistry.getLatestProxyAddr('MultiAdmin'),
      rootRegistry.getLatestProxyAddr('MultiSigWallet'),
    ]);
    await rootRegistry.transferOwnership(multiAdmin);
  }

  if ((await rootRegistry.owner()) !== multiAdmin) {
    throw new Error('Root registry owner should be the multisig admin account');
  }
  return [multiAdmin, multiSigWallet, rootRegistry];
};
module.exports = {
  prepareMultiSigAndRoot,
};
