import {
  UnstructuredUpgradeableTokenV0_1_0,
  UnstructuredUpgradeableTokenV0_2_0,
  UnstructuredUpgradeableTokenV0_3_0,
  UnstructuredUpgradeableTokenV0_4_0,
  UnstructuredOwnedUpgradeabilityProxy,
} from '../helpers/Artifacts';
import { deployUpgradeableContract } from '../helpers/contracts';

const { getLatestVersionFromFs } = require('../helpers/contracts');

let tokenByProxyV0;
let proxy; // every upgrade scenario uses this same UnstructuredOwnedUpgradeabilityProxy
let contractRegistry;
let upgradeableTokenV0;

const upgradeToV0 = async (
  admin,
  unstructuredUpgradeableContractV0 = UnstructuredUpgradeableTokenV0_1_0,
  initParams
) => {
  contractRegistry = await artifacts
    .require(`./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`)
    .new({ from: admin });
  const [
    contractName,
    versionName,
  ] = unstructuredUpgradeableContractV0.contractName.split('V');
  if (!initParams) {
    initParams = [
      ['string', 'string', 'uint', 'uint', 'address', 'address'],
      ['Upgradeable NORI Token', 'NORI', 1, 0, contractRegistry.address, admin],
    ];
  } else {
    initParams[1][4] = contractRegistry.address;
  }

  proxy = await UnstructuredOwnedUpgradeabilityProxy.new(
    contractRegistry.address,
    {
      from: admin,
    }
  );

  [upgradeableTokenV0, tokenByProxyV0] = await deployUpgradeableContract(
    artifacts,
    proxy,
    unstructuredUpgradeableContractV0,
    contractRegistry,
    initParams,
    { from: admin }
  );

  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV0.address);
  return [
    tokenByProxyV0,
    0,
    proxy,
    contractRegistry,
    contractName,
    versionName,
  ];
};

const setStateInV0 = async admin => {
  await tokenByProxyV0.mint(admin, 100, '0x0', { from: admin });
};

const upgradeToV1 = async admin => {
  [tokenByProxyV0, , proxy] = await upgradeToV0(admin);
  await setStateInV0(admin);

  const [upgradeableTokenV1, tokenByProxyV1] = await deployUpgradeableContract(
    artifacts,
    proxy,
    UnstructuredUpgradeableTokenV0_2_0,
    contractRegistry,
    null,
    { from: admin }
  );

  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV1.address);
  const tS = await tokenByProxyV1.totalSupply();

  return [tokenByProxyV1, tS.toNumber(), proxy];
};

const upgradeToV2 = async admin => {
  const [, tS, proxy] = await upgradeToV1(admin);

  const [upgradeableTokenV2, tokenByProxyV2] = await deployUpgradeableContract(
    artifacts,
    proxy,
    UnstructuredUpgradeableTokenV0_3_0,
    contractRegistry,
    null,
    { from: admin }
  );

  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV2.address);
  return [tokenByProxyV2, tS, proxy];
};

const upgradeToV3 = async admin => {
  const [tokenByProxyV2, , proxy] = await upgradeToV2(admin);

  await tokenByProxyV2.mint(admin, 1666, '0x0', { from: admin });
  const tS = await tokenByProxyV2.totalSupply();

  const [upgradeableTokenV3, tokenByProxyV3] = await deployUpgradeableContract(
    artifacts,
    proxy,
    UnstructuredUpgradeableTokenV0_4_0,
    contractRegistry,
    null,
    { from: admin }
  );

  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV3.address);

  return [tokenByProxyV3, tS, proxy];
};

const rollBackToV2 = async admin => {
  const [, tS, proxy] = await upgradeToV3(admin);

  const [upgradeableTokenV4, tokenByProxyV4] = await deployUpgradeableContract(
    artifacts,
    proxy,
    UnstructuredUpgradeableTokenV0_3_0,
    contractRegistry,
    null,
    { from: admin }
  );

  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV4.address);
  return [tokenByProxyV4, tS, proxy];
};

const upgradeTo = versionNumber => {
  let versionToUpgradeTo;
  if (versionNumber === 0) {
    versionToUpgradeTo = upgradeToV0;
  } else if (versionNumber === 1) {
    versionToUpgradeTo = upgradeToV1;
  } else if (versionNumber === 2) {
    versionToUpgradeTo = upgradeToV2;
  } else if (versionNumber === 3) {
    versionToUpgradeTo = upgradeToV3;
  } else if (versionNumber === 4) {
    versionToUpgradeTo = rollBackToV2;
  }

  return versionToUpgradeTo;
};

module.exports = {
  upgradeTo,
  upgradeToV0,
  upgradeToV1,
  upgradeToV2,
  upgradeToV3,
  rollBackToV2,
};
