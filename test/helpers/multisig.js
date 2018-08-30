const deployOrGetRootRegistry = require('./contracts').deployOrGetRootRegistry;

const prepareMultiSigAndRoot = async (
  { network, artifacts, accounts, deployer, web3 },
  force = false
) => {
  const [admin0, admin1] = accounts;
  let multiAdmin, multiSigWallet;
  const rootRegistry = await deployOrGetRootRegistry(
    { network, artifacts, deployer, web3 },
    force
  );

  // on ropsten we always want to get the MultiSigs from the root, so only in development do we want to create new ones
  if (network === 'develop' || network === 'test' || network === 'testrpc') {
    [multiSigWallet, multiAdmin] = await Promise.all([
      artifacts
        .require('MultiSigWallet')
        .new([admin0, admin1], 1, rootRegistry.address),
      artifacts
        .require('MultiAdmin')
        .new([admin0, admin1], 1, rootRegistry.address),
    ]);

    await rootRegistry.setVersionAsAdmin(
      'MultiAdmin',
      multiAdmin.address,
      '0_1_0',
      multiAdmin.address
    );
    await rootRegistry.setVersionAsAdmin(
      'MultiSigWallet',
      multiSigWallet.address,
      '0_1_0',
      multiSigWallet.address
    );

    await rootRegistry.transferOwnership(multiAdmin.address);
  }
  try {
    const [multiAdminAddr, multiSigWalletAddr] = await Promise.all([
      rootRegistry.getLatestProxyAddr('MultiAdmin'),
      rootRegistry.getLatestProxyAddr('MultiSigWallet'),
    ]);
    multiAdmin = await artifacts.require('MultiAdmin').at(multiAdminAddr);
    multiSigWallet = await artifacts
      .require('MultiSigWallet')
      .at(multiSigWalletAddr);
  } catch (e) {
    throw new Error("MultiSigs haven't been deployed or set in the root");
  }
  if ((await rootRegistry.owner()) !== multiAdmin.address) {
    throw new Error(
      `Danger! Root owner should be the MultiAdmin contract (${
        multiAdmin.address
      }), but it is currently owned by: ${await rootRegistry.owner()}`
    );
  }

  return { multiAdmin, multiSigWallet, rootRegistry };
};
module.exports = {
  prepareMultiSigAndRoot,
};
