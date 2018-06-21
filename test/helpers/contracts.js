import { encodeCall } from '../helpers/utils';
import {
  UnstructuredOwnedUpgradeabilityProxy,
  TonToken,
  ContractRegistryV0_1_0,
} from '../helpers/artifacts';

const { promisify } = require('util');

function getLogs(Event, filter, additionalFilters) {
  const query = Event(filter, additionalFilters);
  return promisify(query.get.bind(query))();
}

const repeat = (func, times) => {
  for (let i = 0; i < times; i++) {
    func();
  }
};

const deployContract = (
  contract,
  [...constructorParams],
  { ...deployParams }
) => contract.new(...constructorParams, { ...deployParams });

// todo deprecate this after prs for upgrading
const deployToken = (name, symbol, granularity, totalSupply, eip820RegAddr) =>
  TonToken.new(name, symbol, granularity, totalSupply, eip820RegAddr);

// deploy an unstructured upgradeable contract and proxy, initialize the contract,
// then create a contract at the proxy's address.
const deployUpgradeableContract = async (
  passedProxy = null,
  contract,
  registry,
  initializeParams,
  [...constructorParams],
  { ...deployParams }
) => {
  const contractRegistry = registry || (await ContractRegistryV0_1_0.new());
  const [contractName, versionName] = contract.contractName.split('V');
  // use a proxy already existing in the testrpc or deploy a new one (useful for testing multi upgrade scenarios)
  const proxy =
    passedProxy === null
      ? await deployContract(
          UnstructuredOwnedUpgradeabilityProxy,
          [contractRegistry.address],
          {
            ...deployParams,
          }
        )
      : passedProxy;

  const contractToMakeUpgradeable = await deployContract(
    contract,
    ...constructorParams,
    { ...deployParams }
  );

  if (initializeParams !== null) {
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
      {
        ...deployParams,
      }
    );
  } else {
    await proxy.upgradeTo(
      contractName,
      versionName,
      contractToMakeUpgradeable.address,
      {
        ...deployParams,
      }
    );
  }

  const upgradeableContractV0 = await contract.at(proxy.address, {
    ...deployParams,
  });
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
  deployToken,
  repeat,
  deployContract,
};
