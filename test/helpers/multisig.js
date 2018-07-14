const deployOrGetRootRegistry = require('./contracts').deployOrGetRootRegistry;

const prepareMultiSigAndRoot = async (
  { network, artifacts, accounts, deployer, web3 },
  force = false
) => {
  const admin0 = accounts[0];
  const admin1 = accounts[1];
  let multiAdmin, multiSigWallet;
  const rootRegistry = await deployOrGetRootRegistry(
    { network, artifacts, deployer, web3 },
    force
  );

  // on ropsten we always want to get the multisigs from the root, so only in development do we want to create new ones
  if (network === 'develop' || network === 'test') {
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

    await rootRegistry.transferOwnership(multiAdmin.address);
  }
  try {
    await Promise.all([
      rootRegistry.getLatestProxyAddr('MultiAdmin'),
      rootRegistry.getLatestProxyAddr('MultiSigWallet'),
    ]);
  } catch (e) {
    throw new Error('MultiSigs havent been deployed or set in the root');
  }
  if ((await rootRegistry.owner()) !== multiAdmin.address) {
    throw new Error(
      'Danger! Root owner should be the multisig admin account, but it is currently owned by:',
      await rootRegistry.owner()
    );
  }

  return { multiAdmin, multiSigWallet, rootRegistry };
};
module.exports = {
  prepareMultiSigAndRoot,
};
