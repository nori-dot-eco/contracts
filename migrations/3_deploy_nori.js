/* globals artifacts web3 */
const bluebird = require('bluebird');
const {
  deployOrGetRootRegistry,
  upgradeAndTransferToMultiAdmin,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const utils = require('../test/helpers/utils');
const {
  nori,
  participantRegistry,
  crc,
  participant,
  supplier,
  verifier,
  fifoCrcMarket,
} = require('../test/helpers/contractConfigs');

const MultiAdmin = artifacts.require('MultiAdmin');

const upgradeAndMigrateContracts = (
  config,
  adminAccountAddress,
  contractsToUpgrade,
  multiAdmin,
  registry
) =>
  bluebird.mapSeries(contractsToUpgrade, async contractConfig => {
    const configuredContract = await contractConfig(multiAdmin, registry);
    const upgrade = () =>
      upgradeAndTransferToMultiAdmin(
        config,
        configuredContract.contractName,
        registry,
        [configuredContract.initParamTypes, configuredContract.initParamVals],
        { from: adminAccountAddress },
        multiAdmin
      );
    return utils.onlyWhitelisted(config, upgrade);
  });

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let root,
      registry,
      adminAccountAddress,
      multiAdmin,
      registryVersionName,
      registryImp,
      registryProxyAddr,
      multiSigWallet;
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
      multiAdmin = MultiAdmin.at(
        await root.getLatestProxyAddr.call('MultiAdmin')
      );
      multiSigWallet = await root.getLatestProxyAddr.call('MultiSigWallet');
      [
        registryVersionName,
        registryImp,
        registryProxyAddr,
      ] = await root.getVersionForContractName('ContractRegistry', -1);
      registry = await artifacts
        .require(`ContractRegistryV${registryVersionName}`)
        .at(registryProxyAddr);
    } catch (e) {
      throw new Error(
        'Something went wrong. A root, multiadmin and contract registry should have been configured in a previous migration'
      );
    }
    // Check registry if each contract needs to be upgraded, and if so, do just that
    const contractsToUpgrade = [
      nori,
      participantRegistry,
      crc,
      participant,
      supplier,
      verifier,
      fifoCrcMarket,
    ];
    const deployedContracts = await upgradeAndMigrateContracts(
      config,
      adminAccountAddress,
      contractsToUpgrade,
      multiAdmin,
      registry
    );

    utils.printRegistryInfo(
      multiAdmin,
      multiSigWallet,
      {
        registryVersionName,
        registry,
        registryImp,
      },
      root,
      deployedContracts
    );
  });
};
