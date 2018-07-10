import { encodeCall } from '../helpers/utils';

const ensUtils = require('./ens');
const { promisify } = require('util');
const glob = require('glob');
const path = require('path');

function getLogs(Event, filter, additionalFilters) {
  const query = Event(filter, additionalFilters);
  return promisify(query.get.bind(query))();
}

const deployOrGetRootRegistry = async config => {
  const { network, artifacts, deployer } = config;
  if (network === 'develop' || network === 'test') {
    try {
      await artifacts.require('RootRegistryV0_1_0').deployed();
    } catch (e) {
      console.log(
        `Setting up new Root Registry as it looks like it has never been deployed on ${network}`
      );
      return deployer.deploy(artifacts.require('RootRegistryV0_1_0'));
    }
  }
  const rootRegistry = await ensUtils.getENSDetails(config);
  if (rootRegistry) {
    console.log('Found existing registry at', rootRegistry.address);
  } else {
    throw new Error('No root registry can be found on the network.');
  }
  return rootRegistry;
};

const parseContractName = contractName => {
  const [, name, version] = contractName.match(/^(.*)V([^V]+)$/);
  return [name, version];
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
  deployParams = {}
) => {
  const [contractName, versionName] = parseContractName(contract.contractName);
  const contractRegistry =
    registry ||
    (await artifacts.require('ContractRegistryV0_1_0').new(deployParams));
  // use a proxy already existing in the testrpc or deploy a new one
  // (useful for testing multi upgrade scenarios)
  const proxy =
    passedProxy ||
    (await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .new(contractRegistry.address, deployParams));

  const contractToMakeUpgradeable = await contract.new(deployParams);

  if (initializeParams) {
    const initializeData = encodeCall(
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
// todo deprecate
const upgradeToContract = async (
  artifacts,
  contract,
  registry,
  initializeParamTypes,
  initializeParamValues,
  deployParams
) => {
  const [contractName, versionName] = parseContractName(contract.contractName);

  let latestVersionName, proxyAddress;
  try {
    [
      latestVersionName,
      ,
      proxyAddress,
    ] = await registry.getVersionForContractName(contractName, -1);
  } catch (e) {
    // doesn't exist yet, but that's OK.
  }

  if (latestVersionName !== versionName) {
    console.log(
      contractName,
      'is out of date. Deployed Version:',
      latestVersionName,
      'New Version:',
      versionName
    );

    let existingProxy = null;
    if (proxyAddress) {
      existingProxy = contract.at(proxyAddress);
    }

    const [, , newProxy] = await deployUpgradeableContract(
      artifacts,
      existingProxy,
      contract,
      registry,
      [initializeParamTypes, initializeParamValues],
      deployParams
    );
    console.log(contractName, 'updated to', versionName, newProxy.address);
    return newProxy;
  }
  console.log(
    contractName,
    'already up to date at version',
    versionName,
    proxyAddress
  );
  return contract.at(proxyAddress);
};

const deployOrGetProxy = async (
  config,
  existingProxyAddr,
  contractRegistry,
  multiAdmin,
  deployParams
) => {
  const { artifacts } = config;
  let proxy = null;
  if (existingProxyAddr) {
    proxy = await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .at(existingProxyAddr);
  } else {
    proxy = await artifacts
      .require('UnstructuredOwnedUpgradeabilityProxy')
      .new(contractRegistry.address, deployParams);
    await proxy.transferProxyOwnership(multiAdmin.address);
  }
  return proxy;
};

const initOrUpgradeFromMultiAdmin = async (
  contractToInit,
  contractName,
  versionName,
  proxy,
  multiAdmin,
  initializeParams,
  deployParams
) => {
  let upgradeTxData;

  if ((await contractToInit.initialized.call()) === false) {
    upgradeTxData = proxy.contract.upgradeToAndCall.getData(
      contractName,
      versionName,
      contractToInit.address,
      encodeCall(
        'initialize',
        initializeParams[0], // ex: ['string', 'string', 'uint', 'uint', 'address', 'address'],
        initializeParams[1] // ex: ['Upgradeable NORI Token', 'NORI', 1, 0, contractRegistry.address, admin]
      ),
      deployParams
    );
  } else {
    upgradeTxData = proxy.contract.upgradeTo.getData(
      contractName,
      versionName,
      contractToInit.address,
      deployParams
    );
  }
  await multiAdmin.submitTransaction(proxy.address, 0, upgradeTxData);
};

const getContractAtRegistry = () => {};

const upgradeAndTransferToMultiAdmin = async (
  config,
  contractName,
  registry,
  initializeParams,
  deployParams,
  multiAdmin
) => {
  const { artifacts } = config;
  const versionName = await getLatestVersionFromFs(contractName);
  const contract = artifacts.require(`${contractName}V${versionName}`);

  let latestVersionName,
    proxyAddress,
    upgradeableContractAtProxy,
    contractToMakeUpgradeable,
    proxy;
  try {
    [
      latestVersionName,
      ,
      proxyAddress,
    ] = await registry.getVersionForContractName(contractName, -1);
  } catch (e) {
    // doesn't exist yet, but that's OK.
  }

  if (latestVersionName !== versionName) {
    console.log(
      contractName,
      'is out of date. Deployed Version:',
      latestVersionName,
      'New Version:',
      versionName
    );

    contractToMakeUpgradeable = await contract.new(deployParams);
    proxy = await deployOrGetProxy(
      config,
      proxyAddress,
      registry,
      multiAdmin,
      deployParams
    );
    await initOrUpgradeFromMultiAdmin(
      contractToMakeUpgradeable,
      contractName,
      versionName,
      proxy,
      multiAdmin,
      initializeParams,
      deployParams
    );

    upgradeableContractAtProxy = await contract.at(proxy.address, deployParams);
  } else {
    console.log(
      contractName,
      'already up to date at version',
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
  };
};

module.exports = {
  getContractAtRegistry,
  upgradeAndTransferToMultiAdmin,
  deployUpgradeableContract,
  upgradeToContract,
  getLogs,
  getLatestVersion,
  deployLatestUpgradeableContract,
  deployOrGetRootRegistry,
};
