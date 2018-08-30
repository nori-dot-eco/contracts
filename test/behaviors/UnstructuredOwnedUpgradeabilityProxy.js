import { assertRevert, encodeCall } from '../helpers/utils';
import {
  UnstructuredUpgradeableTokenV0_1_0,
  UnstructuredUpgradeableTokenV0_2_0,
} from '../helpers/Artifacts';
import {
  getLogs,
  deployUpgradeableContract,
  getLatestVersionFromFs,
} from '../helpers/contracts';
import { upgradeToV0 } from './UnstructuredUpgrades';

const testUnstructuredOwnedUpgradeabilityProxyFuncs = (
  admin,
  ownedUpContract = false,
  initParams = []
) => {
  let proxy;
  let contractRegistry;
  beforeEach(async () => {
    if (initParams.length === 0) {
      [, , proxy] = await upgradeToV0(
        admin,
        UnstructuredUpgradeableTokenV0_1_0
      );
    } else {
      contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [, , proxy] = await deployUpgradeableContract(
        artifacts,
        null,
        ownedUpContract,
        contractRegistry,
        initParams,
        { from: admin }
      );
    }
  });
  describe('proxyOwner', () => {
    it('should return the admin account as the owner', async () => {
      const owner = await proxy.proxyOwner({ from: admin });
      assert.equal(owner, admin);
    });
  });
};

// Note: some event tests also exist in behaviors/Registry.js
const testEvents = (
  admin,
  nonAdmin,
  ownedUpContract = false,
  initParams = []
) => {
  let proxy;
  let transferOwnershipLogs; // ProxyOwnershipTransferred(address previousOwner, address newOwner);
  let upgradedLogs;
  let tokenByProxyV0;
  let contractRegistry;
  let contractName;
  context('After transferring ownership', () => {
    before(async () => {
      if (initParams.length === 0) {
        [
          tokenByProxyV0,
          ,
          proxy,
          contractRegistry,
          contractName,
        ] = await upgradeToV0(admin, UnstructuredUpgradeableTokenV0_1_0);
      } else {
        [
          ,
          tokenByProxyV0,
          proxy,
          ,
          contractName,
        ] = await deployUpgradeableContract(
          artifacts,
          null,
          ownedUpContract,
          contractRegistry,
          initParams,
          { from: admin }
        );
      }
      await proxy.upgradeTo(
        contractName,
        '1.0.0-alpha',
        tokenByProxyV0.address,
        {
          from: admin,
        }
      );
      upgradedLogs = await getLogs(proxy.Upgraded);
      await proxy.transferProxyOwnership(nonAdmin, { from: admin });

      transferOwnershipLogs = await getLogs(proxy.ProxyOwnershipTransferred);
    });
    describe('ProxyOwnershipTransferred (event)', () => {
      it('should put a ProxyOwnershipTransferred event into the logs', () => {
        assert.equal(
          transferOwnershipLogs.length,
          1,
          'Expected one ProxyOwnershipTransferred event to have been sent'
        );
      });
      it("should include a 'previousOwner' arg", () => {
        assert.equal(
          transferOwnershipLogs[0].args.previousOwner,
          admin,
          'Expected ProxyOwnershipTransferred Event "previousOwner" arg to be the admin account'
        );
      });
      it("should include an 'newOwner' arg", () => {
        assert.equal(
          transferOwnershipLogs[0].args.newOwner,
          nonAdmin,
          'Expected ProxyOwnershipTransferred Event "newOwner" arg to be the nonAdmin account'
        );
      });
    });
  });
  context('After upgrading', () => {
    describe('Upgraded (event)', () => {
      it('should put a Upgraded event into the logs', () => {
        assert.equal(
          upgradedLogs.length,
          1,
          'Expected one Upgraded event to have been sent'
        );
      });
      it("should include an 'implementation' arg", () => {
        assert.equal(
          upgradedLogs[0].args.implementation,
          tokenByProxyV0.address,
          'Expected Upgraded Event "implementation" arg to be the tokenByProxyV0 address'
        );
      });
    });
  });
};

const testUnstructuredOwnedUpgradeabilityProxyInitialState = (
  admin,
  ownedUpContract = false,
  initParams = []
) => {
  let proxy;
  let contractRegistry;
  beforeEach(async () => {
    if (initParams.length === 0) {
      [, , proxy, contractRegistry] = await upgradeToV0(
        admin,
        UnstructuredUpgradeableTokenV0_1_0
      );
    } else {
      contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [, , proxy] = await deployUpgradeableContract(
        artifacts,
        null,
        ownedUpContract,
        contractRegistry,
        initParams,
        { from: admin }
      );
    }
  });
  describe('proxyOwner', () => {
    it('should return the admin account as the owner', async () => {
      const owner = await proxy.proxyOwner({ from: admin });
      assert.equal(owner, admin);
    });
  });
};

const testOnlyProxyOwnerUnstructuredOwnedUpgradeabilityProxyFuncs = (
  admin,
  nonAdmin,
  ownedUpContract = false,
  initParams = []
) => {
  let proxy;
  let contractByProxyV0;
  let contractRegistry;
  let contractName;
  beforeEach(async () => {
    if (initParams.length === 0) {
      [
        contractByProxyV0,
        ,
        proxy,
        contractRegistry,
        contractName,
      ] = await upgradeToV0(admin, UnstructuredUpgradeableTokenV0_1_0);
    } else {
      contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new({ from: admin });
      [
        ,
        contractByProxyV0,
        proxy,
        ,
        contractName,
      ] = await deployUpgradeableContract(
        artifacts,
        null,
        ownedUpContract,
        contractRegistry,
        initParams,
        { from: admin }
      );
    }
  });
  describe('upgradeTo', () => {
    it('should be able to upgrade the proxy', async () => {
      await proxy.upgradeTo(
        contractName,
        '1.0.0-alpha',
        contractByProxyV0.address,
        {
          from: admin,
        }
      );
      const implementation = await proxy.implementation({ from: admin });
      assert.equal(implementation, contractByProxyV0.address);
    });
    it('should not be able to upgrade the proxy from a non admin account', async () => {
      await assertRevert(
        proxy.upgradeTo(
          contractName,
          '1.0.0-alpha',
          contractByProxyV0.address,
          {
            from: nonAdmin,
          }
        )
      );
    });
  });
  describe('upgradeToAndCall', () => {
    let funcCallData;
    beforeEach(async () => {
      contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new({ from: admin });
      funcCallData = encodeCall(
        'initialize',
        ['string', 'string', 'uint', 'uint', 'address', 'address'],
        [
          'Upgradeable NORI Token',
          'NORI',
          1,
          0,
          contractRegistry.address,
          admin,
        ]
      );
    });
    it('should be able to upgradeToAndCall the proxy', async () => {
      await upgradeToV0(admin, UnstructuredUpgradeableTokenV0_1_0);
    });
    it('should not be able to upgradeToAndCall the proxy from a non admin account', async () => {
      const upgradeableTokenV1 = await UnstructuredUpgradeableTokenV0_2_0.new({
        from: admin,
      });
      await assertRevert(
        proxy.upgradeToAndCall(
          contractName,
          '1.0.0-alpha',
          upgradeableTokenV1.address,
          funcCallData,
          {
            from: nonAdmin,
          }
        )
      );
    });
  });
  describe('transferProxyOwnership', () => {
    it('should be able to transfer ownership of the proxy to a new address from an admin account', async () => {
      await proxy.transferProxyOwnership(nonAdmin, { from: admin });
      const owner = await proxy.proxyOwner({ from: admin });
      assert.equal(owner, nonAdmin);
    });
    it('should not be able to transfer ownership of the proxy to a new address from a non admin account', async () => {
      await assertRevert(
        proxy.transferProxyOwnership(nonAdmin, { from: nonAdmin })
      );
      const owner = await proxy.proxyOwner({ from: admin });
      assert.equal(owner, admin);
    });
    it('should not be able to transfer ownership of the proxy to a 0 address from an admin account', async () => {
      await assertRevert(proxy.transferProxyOwnership(0, { from: admin }));
      const owner = await proxy.proxyOwner({ from: admin });
      assert.equal(owner, admin);
    });
  });
};

const testUnstructuredOwnedUpgradeabilityProxyImplementer = (
  admin,
  nonAdmin,
  ownedUpContract = false,
  initParams = []
) => {
  let proxy;
  let tokenByProxyV0;
  let contractRegistry;
  let contractName;
  beforeEach(async () => {
    if (initParams.length === 0) {
      [
        tokenByProxyV0,
        ,
        proxy,
        contractRegistry,
        contractName,
      ] = await upgradeToV0(admin, UnstructuredUpgradeableTokenV0_1_0);
    } else if (!tokenByProxyV0) {
      contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [
        ,
        tokenByProxyV0,
        proxy,
        ,
        contractName,
      ] = await deployUpgradeableContract(
        artifacts,
        proxy || null,
        ownedUpContract,
        contractRegistry,
        initParams,
        { from: admin }
      );
    }
    assert.ok(tokenByProxyV0);
  });

  describe('upgradeTo', () => {
    it('should upgrade to a new version', async () => {
      const v1 = ownedUpContract || UnstructuredUpgradeableTokenV0_2_0;

      const upgradeableTokenV1 = await v1.new({ from: admin });

      await proxy.upgradeTo(
        contractName,
        '1.0.0-alpha',
        upgradeableTokenV1.address,
        {
          from: admin,
        }
      );
      const implementation = await proxy.implementation({ from: admin });
      assert.equal(implementation, upgradeableTokenV1.address);
    });

    it('should fail trying to upgrade from a non admin account', async () => {
      const v1 = ownedUpContract || UnstructuredUpgradeableTokenV0_2_0;

      const upgradeableTokenV1 = await v1.new({ from: admin });
      await assertRevert(
        proxy.upgradeTo(
          contractName,
          '1.0.0-alpha',
          upgradeableTokenV1.address,
          {
            from: nonAdmin,
          }
        )
      );
    });

    it('should fail upgrading to the same implementation', async () => {
      const implementation = await proxy.implementation({ from: admin });
      await assertRevert(
        proxy.upgradeTo(contractName, '1.0.0-alpha', implementation, {
          from: admin,
        })
      );
    });
  });
};

module.exports = {
  testEvents,
  testUnstructuredOwnedUpgradeabilityProxyFuncs,
  testUnstructuredOwnedUpgradeabilityProxyImplementer,
  testOnlyProxyOwnerUnstructuredOwnedUpgradeabilityProxyFuncs,
  testUnstructuredOwnedUpgradeabilityProxyInitialState,
};
