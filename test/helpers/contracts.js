import { encodeCall } from '../helpers/utils';

const { promisify } = require('util');

function getLogs(Event, filter, additionalFilters) {
  const query = Event(filter, additionalFilters);
  return promisify(query.get.bind(query))();
}

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
  const [contractName, versionName] = contract.contractName.split('V');
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

module.exports = {
  deployUpgradeableContract,
  getLogs,
};
