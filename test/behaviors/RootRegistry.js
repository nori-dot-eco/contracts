/* globals artifacts web3 */
import {
  UnstructuredUpgradeableTokenV0_2_0,
  UnstructuredUpgradeableTokenV0_1_0,
} from '../helpers/Artifacts';

const { deployUpgradeableContract } = require('../helpers/contracts');
const getNamedAccounts = require('../helpers/getNamedAccounts');
const { getLatestVersionFromFs } = require('../helpers/contracts');

const namedAccounts = getNamedAccounts(web3);

let registryProxy;
let tokenProxy;
let tokenProxyImpV0;
let rootRegistryAtProxy;
let registryAtProxyV0;
let tokenProxyImpV1;
let registryV1AtRoot;
let registryV0AtRoot;

const setupTests = async () => {
  [, rootRegistryAtProxy] = await deployUpgradeableContract(
    artifacts,
    null,
    artifacts.require(
      `./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`
    ),
    null,
    [['address'], [namedAccounts.admin0]],
    { from: namedAccounts.admin0 }
  );

  [, registryAtProxyV0, registryProxy] = await deployUpgradeableContract(
    artifacts,
    null,
    await artifacts.require(
      `./ContractRegistryV${await getLatestVersionFromFs('ContractRegistry')}`
    ),
    rootRegistryAtProxy,
    [['address'], [namedAccounts.admin0]],
    { from: namedAccounts.admin0 }
  );
  [, , tokenProxy] = await deployUpgradeableContract(
    artifacts,
    null,
    UnstructuredUpgradeableTokenV0_1_0,
    registryAtProxyV0,
    [
      ['string', 'string', 'uint', 'uint', 'address', 'address'],
      [
        'Upgradeable NORI Token',
        'NORI',
        1,
        0,
        registryAtProxyV0.address,
        namedAccounts.admin0,
      ],
    ],
    { from: namedAccounts.admin0 }
  );
  tokenProxyImpV0 = await tokenProxy.implementation();
};

const shouldBehaveLikeRootRegistry = () => {
  beforeEach(async () => {
    await setupTests();
  });
  context('verify that root registry is tracking the contract registry', () => {
    describe('getLatestProxyAddr', () => {
      it('should get the token proxy', async () => {
        const rootRegistryV = await rootRegistryAtProxy.getLatestProxyAddr(
          'ContractRegistry'
        );
        assert.equal(
          registryAtProxyV0.address,
          rootRegistryV,
          'did not register the correct registry version'
        );
      });
    });
  });
  context(
    'upgrade the contract registry and verify it tracked both versions',
    () => {
      beforeEach(async () => {
        await deployUpgradeableContract(
          artifacts,
          tokenProxy,
          UnstructuredUpgradeableTokenV0_2_0,
          registryAtProxyV0,
          null,
          { from: namedAccounts.admin0 }
        );
      });
      describe('getVersionForContractName', () => {
        it('should hold the first version of the token', async () => {
          const [, tokenV0] = await registryAtProxyV0.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            1
          );
          assert.equal(
            tokenProxyImpV0,
            tokenV0,
            'did not keep track of the first token version'
          );
        });
        it('should hold the second version of the token', async () => {
          const [, tokenV0] = await registryAtProxyV0.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            1
          );
          const [, tokenV1] = await registryAtProxyV0.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            2
          );
          tokenProxyImpV1 = await tokenProxy.implementation();
          assert.equal(
            tokenProxyImpV0 + tokenProxyImpV1,
            tokenV0 + tokenV1,
            'did not keep track of the second token version'
          );
        });
      });
    }
  );

  context(
    'upgrade the contract registry and verify it tracked both registry versions',
    () => {
      let registryProxyImpV0;
      let registryProxyImpV1;
      beforeEach(async () => {
        registryProxyImpV0 = await registryProxy.implementation();
        [, registryAtProxyV0] = await deployUpgradeableContract(
          artifacts,
          registryProxy,
          await artifacts.require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          ),
          rootRegistryAtProxy,
          null,
          { from: namedAccounts.admin0 }
        );
        registryProxyImpV1 = await registryProxy.implementation();
      });
      describe('getVersionForContractName', () => {
        it('should hold the first version of the contract registry', async () => {
          const [
            ,
            registryV0,
          ] = await rootRegistryAtProxy.getVersionForContractName(
            'ContractRegistry',
            1
          );
          assert.equal(
            registryProxyImpV0,
            registryV0,
            'did not keep track of the first contract registry version'
          );
        });
        it('should hold the second version of the token', async () => {
          const [
            ,
            registryV1,
          ] = await rootRegistryAtProxy.getVersionForContractName(
            'ContractRegistry',
            2
          );
          assert.equal(
            registryProxyImpV1,
            registryV1,
            'did not keep track of the second contract registry version'
          );
        });
      });
    }
  );
};

// the following works because we are using the same registry proxy from the original deployed registry :)
const testRegistryUpgradeAndHistoryPreservation = () => {
  context(
    'upgrade the a contract at the first registry, then upgrade the registry and verify that you can lookup the old versions in the second registry',
    () => {
      beforeEach(async () => {
        await setupTests();
        const [
          ,
          ,
          registryV0Proxy,
        ] = await rootRegistryAtProxy.getVersionForContractName(
          'ContractRegistry',
          0
        );
        registryV0AtRoot = await artifacts
          .require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          )
          .at(registryV0Proxy);

        [, , tokenProxy] = await deployUpgradeableContract(
          artifacts,
          null,
          UnstructuredUpgradeableTokenV0_1_0,
          registryV0AtRoot,
          [
            ['string', 'string', 'uint', 'uint', 'address', 'address'],
            [
              'Upgradeable NORI Token',
              'NORI',
              1,
              0,
              registryV0AtRoot.address,
              namedAccounts.admin0,
            ],
          ],
          { from: namedAccounts.admin0 }
        );
        tokenProxyImpV0 = await tokenProxy.implementation();

        await deployUpgradeableContract(
          artifacts,
          registryProxy,
          await artifacts.require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          ),
          rootRegistryAtProxy,
          null,
          { from: namedAccounts.admin0 }
        );

        const [
          ,
          ,
          registryV1Proxy,
        ] = await rootRegistryAtProxy.getVersionForContractName(
          'ContractRegistry',
          1
        );

        registryV1AtRoot = await artifacts
          .require(
            `./ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          )
          .at(registryV1Proxy);
        await deployUpgradeableContract(
          artifacts,
          tokenProxy,
          UnstructuredUpgradeableTokenV0_2_0,
          registryV1AtRoot,
          null,
          { from: namedAccounts.admin0 }
        );
        tokenProxyImpV1 = await tokenProxy.implementation();
      });
      describe('getVersionForContractName', () => {
        it('should hold the first implementation of the token in the first registry', async () => {
          const [, tokenV0] = await registryV0AtRoot.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            1
          );
          assert.equal(
            tokenProxyImpV0,
            tokenV0,
            'did not keep track of the token in the first registry'
          );
        });
        it('should hold the second implementation of the token in the second registry', async () => {
          const [, tokenV1] = await registryV1AtRoot.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            2
          );
          assert.equal(
            tokenProxyImpV1,
            tokenV1,
            'did not keep track of the token in the second registry'
          );
        });
      });
    }
  );
};

module.exports = {
  shouldBehaveLikeRootRegistry,
  testRegistryUpgradeAndHistoryPreservation,
};
