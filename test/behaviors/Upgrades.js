import {
  UpgradeableTokenV0,
  UpgradeableTokenV1,
  EIP820Registry,
  EternalStorageProxy,
  UpgradeableTokenV2,
  UpgradeableTokenV3,
} from '../helpers/artifacts';

let tokenByProxyV0;
let proxy; // every upgrade scenario uses this same EternalStorageProxy
let eip820Registry;
let upgradeableTokenV0;
let upgradeableTokenV1;
let tokenByProxyV1;
let upgradeableTokenV3;
const createUpgradeableToken = async admin => {
  eip820Registry = await EIP820Registry.new({ from: admin });
  proxy = await EternalStorageProxy.new({ from: admin });
  upgradeableTokenV0 = await UpgradeableTokenV0.new(
    'NORI Token',
    'NORI',
    1,
    0,
    eip820Registry.address,
    { from: admin }
  );
  await proxy.upgradeTo('0', upgradeableTokenV0.address, { from: admin });
  tokenByProxyV0 = await UpgradeableTokenV0.at(proxy.address, { from: admin });
  await tokenByProxyV0.init(
    'Upgradeable NORI Token',
    'NORI',
    1,
    0,
    eip820Registry.address,
    {
      from: admin,
    }
  );
  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV0.address);
  return [tokenByProxyV0, 0, proxy];
};

const setStateInV0 = async admin => {
  await tokenByProxyV0.mint(admin, 100, '0x0', { from: admin });
};

const upgradeToV1 = async admin => {
  [tokenByProxyV0] = await createUpgradeableToken(admin);
  await setStateInV0(admin);

  upgradeableTokenV1 = await UpgradeableTokenV1.new(
    'NORI Token',
    'NORI',
    1,
    0,
    eip820Registry.address,
    { from: admin }
  );
  let currVersion = await proxy.version();
  assert.equal(currVersion, '0');
  await proxy.upgradeTo('1', upgradeableTokenV1.address, { from: admin });
  tokenByProxyV1 = await UpgradeableTokenV1.at(proxy.address, { from: admin });
  currVersion = await proxy.version();
  assert.equal(currVersion, '1');
  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV1.address);
  const tS = await tokenByProxyV1.totalSupply();

  return [tokenByProxyV1, tS.toNumber(), proxy];
};

const upgradeToV2 = async admin => {
  const [, tS] = await upgradeToV1(admin);

  const upgradeableTokenV2 = await UpgradeableTokenV2.new(
    'NORI Token',
    'NORI',
    1,
    0,
    eip820Registry.address,
    { from: admin }
  );
  let currVersion = await proxy.version();
  assert.equal(currVersion, '1');
  await proxy.upgradeTo('2', upgradeableTokenV2.address, { from: admin });
  const tokenByProxyV2 = await UpgradeableTokenV2.at(proxy.address, {
    from: admin,
  });
  currVersion = await proxy.version();
  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV2.address);
  assert.equal(currVersion, '2');
  return [tokenByProxyV2, tS, proxy];
};

const upgradeToV3 = async admin => {
  const [, tS] = await upgradeToV2(admin);

  upgradeableTokenV3 = await UpgradeableTokenV3.new({ from: admin });
  let currVersion = await proxy.version();
  assert.equal(currVersion, '2');

  await proxy.upgradeTo('3', upgradeableTokenV3.address, { from: admin });
  const tokenByProxyV3 = await UpgradeableTokenV3.at(proxy.address, {
    from: admin,
  });
  currVersion = await proxy.version();
  const impAddr = await proxy.implementation();
  assert.equal(impAddr, upgradeableTokenV3.address);
  assert.equal(currVersion, '3');

  return [tokenByProxyV3, tS, proxy];
};

const upgradeTo = versionNumber => {
  let versionToUpgradeTo;
  if (versionNumber === 0) {
    versionToUpgradeTo = createUpgradeableToken;
  }
  if (versionNumber === 1) {
    versionToUpgradeTo = upgradeToV1;
  }
  if (versionNumber === 2) {
    versionToUpgradeTo = upgradeToV2;
  }
  if (versionNumber === 3) {
    versionToUpgradeTo = upgradeToV3;
  }

  return versionToUpgradeTo;
};

module.exports = {
  upgradeTo,
  upgradeToV1,
  upgradeToV2,
  upgradeToV3,
  createUpgradeableToken,
};
