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
  const { network, artifacts, web3, deployer } = config;
  if (network === 'develop') {
    try {
      await artifacts.require('RootRegistryV0_1_0').deployed();
    } catch (e) {
      return deployer.deploy(artifacts.require('RootRegistryV0_1_0'));
    }
  }
  const rootRegistry = await ensUtils.getENSDetails(network, artifacts, web3);
  if (rootRegistry) {
    console.log('Found existing registry registry at', rootRegistry.address);
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

module.exports = {
  deployUpgradeableContract,
  upgradeToContract,
  getLogs,
  getLatestVersion,
  deployLatestUpgradeableContract,
  deployOrGetRootRegistry,
};
