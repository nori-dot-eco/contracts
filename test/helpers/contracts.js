/* eslint no-console: "off" */
const { promisify } = require('util');
const { mapSeries } = require('bluebird');
const glob = require('glob');
const path = require('path');
const utils = require('./utils');
const ensUtils = require('./ens');

function getLogs(Event, filter, additionalFilters) {
  const query = Event(filter, additionalFilters);
  return promisify(query.get.bind(query))();
}

const parseContractName = contractName => {
  const [, name, version] = contractName.match(/^(.*)V([^V]+)$/);
  return [name, version];
};

const getLatestVersionFromFs = async contractName => {
  const dir = path.join(__dirname, '../../contracts/');
  let latestVersion = '0_0_0';
  return new Promise(res => {
    glob(`${dir}/**/?(${contractName}?(V[0-9]*)).sol`, {}, (er, files) => {
      files.forEach(file => {
        const [latestMajor, latestMinor, latestPatch] = latestVersion.split(
          '_'
        );
        let [, versionToCompare] = parseContractName(file);
        versionToCompare = versionToCompare.split('.')[0];
        const [major, minor, patch] = versionToCompare.split('_');
        if (parseInt(major, 10) > parseInt(latestMajor, 10)) {
          latestVersion = versionToCompare;
        } else if (
          parseInt(major, 10) === parseInt(latestMajor, 10) &&
          parseInt(minor, 10) > parseInt(latestMinor, 10)
        ) {
          latestVersion = versionToCompare;
        } else if (
          parseInt(major, 10) === parseInt(latestMajor, 10) &&
          parseInt(minor, 10) === parseInt(latestMinor, 10) &&
          parseInt(patch, 10) > parseInt(latestPatch, 10)
        ) {
          latestVersion = versionToCompare;
        }
      });
      res(latestVersion);
    });
  });
};
const deployOrGetRootRegistry = async (
  { network, artifacts, deployer, web3 },
  force = false
) => {
  let rootRegistry;
  if (force === true) {
    return artifacts
      .require(`./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`)
      .new();
  } else if (
    network === 'develop' ||
    network === 'test' ||
    network === 'testrpc' ||
    process.env.NUKE
  ) {
    try {
      rootRegistry = await artifacts
        .require(
          `./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`
        )
        .deployed();
    } catch (e) {
      process.env.MIGRATION &&
        console.log(
          `Setting up new Root Registry as it looks like it has never been deployed on ${network}`
        );
      rootRegistry = await deployer.deploy(
        artifacts.require(
          `./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`
        )
      );
    }
  } else if (
    (network === 'ropstenGeth' || network === 'ropsten') &&
    !process.env.NUKE
  ) {
    rootRegistry = await ensUtils.getENSDetails({
      network,
      artifacts,
      web3,
    });
    if (rootRegistry) {
      process.env.MIGRATION &&
        console.log('Found existing RootRegistry at', rootRegistry.address);
    } else {
      throw new Error('No root registry can be found on the network.');
    }
  } else throw new Error('There is no configuration for that network');

  return rootRegistry;
};

const getLatestVersion = async (registry, contractName) => {
  let latestV;
  try {
    [latestV] = await registry.getVersionForContractName(contractName, -1);
  } catch (err) {
    latestV = '0_1_0';
  }

  return latestV;
};

// deploy an unstructured upgradeable contract and proxy, initialize the contract,
// then create a contract at the proxy's address.
// todo deprecate
const deployUpgradeableContract = async (
  artifacts,
  passedProxy = null,
  contract,
  registry,
  initializeParams,
  deployParams = {},
  constructorParams = null
) => {
  const [contractName, versionName] = parseContractName(contract.contractName);
  const contractRegistry =
    registry ||
    (await artifacts
      .require(`./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`)
      .new(deployParams));
  // use a proxy already existing in the testrpc or deploy a new one
  // (useful for testing multi upgrade scenarios)
  const proxy =
    passedProxy ||
    (await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .new(contractRegistry.address, deployParams));
  console.log(contractName, constructorParams);
  const contractToMakeUpgradeable = constructorParams
    ? await contract.new(...constructorParams, deployParams)
    : await contract.new(deployParams);

  if (initializeParams) {
    await contractRegistry.setVersionAsAdmin(
      contractName,
      proxy.address,
      '0_0_0',
      0,
      deployParams
    );
    const initializeData = utils.encodeCall(
      'initialize',
      initializeParams[0], // ex: ['string', 'string', 'uint', 'uint', 'address', 'address'],
      initializeParams[1] // ex: ['Upgradeable NORI Token', 'NORI', 1, 0, contractRegistry.address, admin]
    );

    await proxy.upgradeToAndCall(
      contractName,
      versionName,
      contractToMakeUpgradeable.address,
      initializeData,
      deployParams
    );
  } else {
    await proxy.upgradeTo(
      contractName,
      versionName,
      contractToMakeUpgradeable.address,
      deployParams
    );
  }

  const upgradeableContractAtProxy = await contract.at(
    proxy.address,
    deployParams
  );
  return [
    contractToMakeUpgradeable,
    upgradeableContractAtProxy,
    proxy,
    contractRegistry,
    contractName,
    versionName,
  ];
};

// todo deprecate
const deployLatestUpgradeableContract = async (
  artifacts,
  passedProxy = null,
  contractName,
  registry,
  initializeParams,
  deployParams = {}
) => {
  const latestVersion = await getLatestVersionFromFs(contractName);
  const latestRegistryVersion = await getLatestVersionFromFs(
    'ContractRegistry'
  );
  const contractRegistry =
    registry ||
    (await artifacts
      .require(`ContractRegistryV${latestRegistryVersion}`)
      .new(deployParams));
  const contract = artifacts.require(`${contractName}V${latestVersion}`);

  return deployUpgradeableContract(
    artifacts,
    passedProxy,
    contract,
    contractRegistry,
    initializeParams,
    deployParams
  );
};

const deployOrGetProxy = async (
  artifacts,
  existingProxyAddr,
  contractRegistry,
  multiAdmin,
  deployParams,
  force
) => {
  let proxy = null;
  if (existingProxyAddr && !force) {
    proxy = await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .at(existingProxyAddr);
  } else {
    proxy = await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .new(contractRegistry.address, deployParams);
    await proxy.transferProxyOwnership(multiAdmin.address);
  }
  if ((await proxy.proxyOwner()) !== multiAdmin.address) {
    throw new Error(
      'Proxies need to be owned by the MultiAdmin. Transfer proxy to MultiAdmin first'
    );
  }
  if (proxy === null) {
    throw new Error('Failed to create proxy');
  }
  return proxy;
};

const initOrUpgradeFromMultiAdmin = async (
  upgradeableContractAtProxy,
  contractToInit,
  contractName,
  versionName,
  proxy,
  multiAdmin,
  initializeParams,
  deployParams,
  registry,
  force = false
) => {
  let upgradeTxData,
    currentProxy = false,
    initialized = false;

  try {
    initialized = await upgradeableContractAtProxy.initialized.call();
    currentProxy = await registry.getLatestProxyAddr.call(contractName);
  } catch (e) {
    // doesn't exist yet, but that's OK.
  }

  if (
    (!initialized &&
      (currentProxy === '0x0000000000000000000000000000000000000000' ||
        !currentProxy)) ||
    force
  ) {
    process.env.MIGRATION &&
      console.log(contractName, 'is upgrading and initializing...');

    const setProxyData = registry.contract.setVersionAsAdmin.getData(
      contractName,
      proxy.address,
      '0_0_0',
      0,
      deployParams
    );

    await multiAdmin.submitTransaction(registry.address, 0, setProxyData);
    upgradeTxData = proxy.contract.upgradeToAndCall.getData(
      contractName,
      versionName,
      contractToInit.address,
      utils.encodeCall(
        'initialize',
        initializeParams[0], // ex: ['string', 'string', 'uint', 'uint', 'address', 'address'],
        initializeParams[1] // ex: ['Upgradeable NORI Token', 'NORI', 1, 0, contractRegistry.address, admin]
      ),
      deployParams
    );
  } else {
    process.env.MIGRATION && console.log('Upgrading without initializing...');
    upgradeTxData = proxy.contract.upgradeTo.getData(
      contractName,
      versionName,
      contractToInit.address,
      deployParams
    );
  }
  await multiAdmin.submitTransaction(proxy.address, 0, upgradeTxData);
};

const upgradeAndTransferToMultiAdmin = async (
  artifacts,
  contractName,
  registry,
  initializeParams,
  deployParams,
  multiAdmin,
  constructorParams = null,
  version = null,
  force = false
) => {
  let latestVersionName,
    proxyAddress,
    upgradeableContractAtProxy,
    contractToMakeUpgradeable,
    proxy,
    upgraded = false,
    versionName =
      version === null ? await getLatestVersionFromFs(contractName) : version;
  const contract = artifacts.require(`${contractName}V${versionName}`);
  try {
    [
      latestVersionName,
      ,
      proxyAddress,
    ] = await registry.getVersionForContractName(contractName, -1);
  } catch (e) {
    process.env.MIGRATION &&
      console.log(`No prior proxy or version found for ${contractName}`);
  }

  if (latestVersionName !== versionName || force) {
    try {
      process.env.MIGRATION &&
        console.log(
          'UPGRADE REQUIREMENT DETECTED:',
          contractName,
          'is out of date. Deployed Version:',
          latestVersionName,
          'New Version:',
          versionName
        );

      contractToMakeUpgradeable = constructorParams
        ? await contract.new(...constructorParams, deployParams)
        : await contract.new(deployParams);
      await contractToMakeUpgradeable.transferOwnership(multiAdmin.address);
      proxy = await deployOrGetProxy(
        artifacts,
        proxyAddress,
        registry,
        multiAdmin,
        deployParams,
        force
      );
      upgradeableContractAtProxy = await contract.at(proxy.address);
      await initOrUpgradeFromMultiAdmin(
        upgradeableContractAtProxy,
        contractToMakeUpgradeable,
        contractName,
        versionName,
        proxy,
        multiAdmin,
        initializeParams,
        deployParams,
        registry,
        force
      );

      upgraded = true;
      process.env.MIGRATION &&
        console.log(
          `${contractName} Upgrade successful!`,
          `Implementation:${contractToMakeUpgradeable.address}`,
          `Version: ${versionName}`,
          `Proxy: ${proxy.address}`
        );
    } catch (e) {
      throw new Error('Upgrade and initialization process has failed!');
    }
  } else {
    [
      versionName,
      upgradeableContractAtProxy,
      proxy,
    ] = await registry.getVersionForContractName(contractName, -1);
    process.env.MIGRATION &&
      console.log(
        contractName,
        'already up to date. Using version',
        versionName,
        proxyAddress
      );
  }
  return {
    contractToMakeUpgradeable,
    upgradeableContractAtProxy,
    proxy,
    registry,
    contractName,
    versionName,
    upgraded,
  };
};

// Takes an array contractsToUpgrade, and returns an array of objects containing:
// {
//   contractToMakeUpgradeable,
//   upgradeableContractAtProxy,
//   proxy,
//   registry,
//   contractName,
//   versionName,
//   upgraded,
// }
// Note: the array returned will be in the same order as it was passed in so that it can
// be easily destructured
const upgradeAndMigrateContracts = (
  { network, artifacts, accounts, web3 },
  adminAccountAddress,
  contractsToUpgrade, // <- pass these in the correct order; e.g. contract index 2 may require contract index 1 to be deployed first
  multiAdmin,
  root
) => {
  if (utils.onlyWhitelisted({ network, accounts, web3 })) {
    return mapSeries(contractsToUpgrade, async contractConfig => {
      const {
        contractName,
        constructorParams,
        initParamTypes,
        initParamVals,
        registry,
        versionName,
      } = await contractConfig(root, artifacts);
      return upgradeAndTransferToMultiAdmin(
        artifacts,
        contractName,
        registry,
        [initParamTypes, initParamVals],
        { from: adminAccountAddress },
        multiAdmin,
        constructorParams,
        versionName || null
      );
    });
  }
  throw new Error('There was an issue upgrading and initializing contracts');
};

module.exports = {
  upgradeAndTransferToMultiAdmin,
  deployUpgradeableContract,
  getLogs,
  getLatestVersion,
  deployLatestUpgradeableContract,
  deployOrGetRootRegistry,
  getLatestVersionFromFs,
  upgradeAndMigrateContracts,
};
