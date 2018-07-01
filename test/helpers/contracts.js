import { encodeCall } from '../helpers/utils';

const { promisify } = require('util');

function getLogs(Event, filter, additionalFilters) {
  const query = Event(filter, additionalFilters);
  return promisify(query.get.bind(query))();
}

const parseContractName = contractName => {
  const [, name, version] = contractName.match(/^(.*)V([^V]+)$/);
  return [name, version];
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

  const upgradeableContractV0 = await contract.at(proxy.address, deployParams);
  return [
    contractToMakeUpgradeable,
    upgradeableContractV0,
    proxy,
    registry,
    contractName,
    versionName,
  ];
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
};
