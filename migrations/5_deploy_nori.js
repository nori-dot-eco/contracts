const {
  deployOrGetRootRegistry,
  upgradeAndMigrateContracts,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const utils = require('../test/helpers/utils');
const {
  noriConfig,
  participantRegistryConfig,
  crcConfig,
  participantConfig,
  supplierConfig,
  verifierConfig,
  fifoCrcMarketConfig,
} = require('../test/helpers/contractConfigs');

const MultiAdmin = artifacts.require('MultiAdmin');

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
      multiAdmin = await MultiAdmin.at(
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
        'Something went wrong. A root, MultiAdmin and contract registry should have been configured in a previous migration'
      );
    }
    // Check registry if each contract needs to be upgraded, and if so, do just that
    const contractsToUpgrade = [
      noriConfig,
      participantRegistryConfig,
      crcConfig,
      participantConfig,
      supplierConfig,
      verifierConfig,
      fifoCrcMarketConfig,
    ];
    const deployedContracts = await upgradeAndMigrateContracts(
      config,
      adminAccountAddress,
      contractsToUpgrade,
      multiAdmin,
      root
    );

    const supplierDeployment = deployedContracts.find(
      ({ contractName }) => contractName === 'Supplier'
    );
    const verifierDeployment = deployedContracts.find(
      ({ contractName }) => contractName === 'Verifier'
    );
    const crcDeployment = deployedContracts.find(
      ({ contractName }) => contractName === 'CRC'
    );

    // Supplier interface permissions:
    const supplier = artifacts
      .require(`SupplierV${supplierDeployment.versionName}`)
      .at(supplierDeployment.proxy.address);
    await utils.callFunctionAsMultiAdmin(
      multiAdmin,
      supplier,
      0,
      'toggleInterface',
      ['IMintableCommodity', crcDeployment.proxy.address, true]
    );
    await utils.callFunctionAsMultiAdmin(
      multiAdmin,
      supplier,
      0,
      'toggleInterface',
      ['ICommodity', crcDeployment.proxy.address, true]
    );

    // Verifier interface permissions:
    const verifier = artifacts
      .require(`VerifierV${verifierDeployment.versionName}`)
      .at(verifierDeployment.proxy.address);
    await utils.callFunctionAsMultiAdmin(
      multiAdmin,
      verifier,
      0,
      'toggleInterface',
      ['IVerifiableCommodity', crcDeployment.proxy.address, true]
    );

    utils.printRegistryInfo(
      multiAdmin,
      multiSigWallet,
      {
        registryVersionName,
        registry,
        registryImp,
        registryProxyAddr,
      },
      root,
      deployedContracts
    );
  });
};
