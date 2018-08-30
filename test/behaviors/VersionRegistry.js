/* globals network */
import { setupEnvForTests, assertRevert, assertFail } from '../helpers/utils';

const { getLogs } = require('../helpers/contracts');
const {
  contractRegistryConfig,
  unstructuredUpgradeableTokenV0Config,
  unstructuredUpgradeableTokenV1Config,
  unstructuredUpgradeableTokenV2Config,
  noriConfig,
} = require('../helpers/contractConfigs');
const getNamedAccounts = require('../helpers/getNamedAccounts');

const testVersionRegistryFunctions = (admin, nonAdmin) => {
  contract('ContractRegistry', () => {
    let contractRegistry,
      tokenV1Proxy,
      versionName0,
      versionName1,
      tokenV0Proxy,
      tokenV0Imp,
      tokenV1Imp,
      versionName2,
      tokenV2Imp,
      noriImp,
      multiAdmin;
    beforeEach(async () => {
      ({
        multiAdmin,
        deployedContracts: [
          { upgradeableContractAtProxy: contractRegistry },
          {
            contractToMakeUpgradeable: tokenV0Imp,
            versionName: versionName0,
            proxy: tokenV0Proxy,
          },
          {
            contractToMakeUpgradeable: tokenV1Imp,
            versionName: versionName1,
            proxy: tokenV1Proxy,
          },
          { contractToMakeUpgradeable: tokenV2Imp, versionName: versionName2 },
          { contractToMakeUpgradeable: noriImp },
        ],
      } = await setupEnvForTests(
        [
          contractRegistryConfig,
          unstructuredUpgradeableTokenV0Config,
          unstructuredUpgradeableTokenV1Config,
          unstructuredUpgradeableTokenV2Config,
          noriConfig,
        ],
        getNamedAccounts(web3).admin0,
        {
          network,
          artifacts,
          accounts: getNamedAccounts(web3).allAccounts,
          web3,
        }
      ));
    });
    context(
      'Scenario: Keep track of version history after several upgrades',
      () => {
        it('should maintain history for all versions', async () => {
          const firstImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            1
          );
          const secondImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            2
          );
          const thirdImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            3
          );
          const registeredContractCount = await contractRegistry.registeredContractCount.call();
          assert.equal(
            registeredContractCount.toString(),
            2,
            'Only 2 contracts should be registered (UnstructuredUpgradeableToken, Nori)'
          );
          assert.equal(
            firstImp[1],
            tokenV0Imp.address,
            'Expected the first implementation to be the V0 implementation'
          );
          assert.equal(
            firstImp[2],
            tokenV0Proxy.address,
            'Expected the first implementation to be the V0 proxy'
          );
          assert.equal(
            firstImp[0],
            versionName0,
            'Expected the first version to be 0_1_0'
          );
          assert.equal(
            secondImp[1],
            tokenV1Imp.address,
            'Expected the second implementation to be the V1 implementation'
          );
          assert.equal(
            secondImp[2],
            tokenV1Proxy.address,
            'Expected the first implementation to be the V1 proxy'
          );
          assert.equal(
            secondImp[0],
            versionName1,
            'Expected the second version to be 0_2_0'
          );
          assert.equal(
            thirdImp[1],
            tokenV2Imp.address,
            'Expected the third implementation to be the V2 implementation'
          );
          assert.equal(
            thirdImp[0],
            versionName2,
            'Expected the third version to be 0_3_0'
          );
        });
      }
    );

    context('Test functions', () => {
      describe('initialize(multiAdmin.address)', () => {
        it('should have initialized during setUpEnvForTests', async () => {
          const initialized = await contractRegistry.initialized.call();
          const initLogs = await getLogs(
            contractRegistry.Initialized,
            {},
            {
              fromBlock: 0,
              toBlock: 'latest',
            }
          );
          assert.equal(
            initLogs.length,
            1,
            'Expected one Initialized event to have been emitted'
          );
          assert.equal(
            initLogs[0].args.owner,
            multiAdmin.address,
            `Expected Initialized Event "owner" arg to be ${
              multiAdmin.address
            }, was ${initLogs[0].args.owner} instead`
          );
          assert.equal(
            initialized,
            true,
            'The contract registry did not initialize'
          );
          const reInit = contractRegistry.contract.initialize.getData(
            multiAdmin.address
          );
          await assertFail(
            multiAdmin.submitTransaction(contractRegistry.address, 0, reInit)
          );
        });
      });
      // The following should work with web3 > 1.0 : https://github.com/ethereum/web3.js/issues/1241
      // describe('getVersionHistoryForContractName("UnstructuredUpgradeableToken")', () => {
      //   it('should get entire version history for a contract using the contract name', async () => {
      //     const history = await contractRegistry.getVersionHistoryForContractName.call(
      //       'UnstructuredUpgradeableToken'
      //     );
      //     assert.equal(
      //       history.length,
      //       3,
      //       'The contract history was not returned in the correct array size'
      //     );
      //   });
      // });
      describe('setVersionAsAdmin', () => {
        it('should be able to set the version as the admin', async () => {
          const setVersionAsAdmin = contractRegistry.contract.setVersionAsAdmin.getData(
            'UnstructuredUpgradeableToken',
            tokenV0Proxy.address,
            '0_4_0',
            tokenV0Imp.address
          );
          const setInvalidVersionNameAsAdmin = contractRegistry.contract.setVersionAsAdmin.getData(
            '',
            tokenV0Proxy.address,
            '0_4_0',
            tokenV0Imp.address
          );
          const setInvalidVersionProxyAddressAsAdmin = contractRegistry.contract.setVersionAsAdmin.getData(
            'UnstructuredUpgradeableToken',
            0,
            '0_4_0',
            tokenV0Imp.address
          );
          const setInvalidReuseOfProxyAsAdmin = contractRegistry.contract.setVersionAsAdmin.getData(
            'Nori',
            tokenV0Proxy.address,
            '0_4_0',
            noriImp.address
          );
          const setInvalidVersionImpAsAdmin = contractRegistry.contract.setVersionAsAdmin.getData(
            'UnstructuredUpgradeableToken',
            tokenV0Proxy.address,
            '0_4_0',
            0
          );
          await multiAdmin.submitTransaction(
            tokenV0Proxy.address,
            0,
            setVersionAsAdmin
          );
          await assertFail(
            multiAdmin.submitTransaction(
              contractRegistry.address,
              0,
              setInvalidVersionNameAsAdmin
            )
          );
          await assertFail(
            multiAdmin.submitTransaction(
              contractRegistry.address,
              0,
              setInvalidVersionProxyAddressAsAdmin
            )
          );
          await assertFail(
            multiAdmin.submitTransaction(
              contractRegistry.address,
              0,
              setInvalidVersionImpAsAdmin
            )
          );
          await assertFail(
            multiAdmin.submitTransaction(
              contractRegistry.address,
              0,
              setInvalidReuseOfProxyAsAdmin
            )
          );
        });
      });
      describe('getLatestProxyAddr', () => {
        it('should get the token proxy', async () => {
          const latestProxyAddress = await contractRegistry.getLatestProxyAddr.call(
            'UnstructuredUpgradeableToken'
          );
          assert.equal(
            tokenV0Proxy.address,
            latestProxyAddress,
            'Wrong proxy address returned from getLatestProxyAddress'
          );
        });
      });
      describe('getContractNameAndHashAtProxy', () => {
        it('should get the contract name and hash at the proxy', async () => {
          const [
            tokenName,
            tokenNameHash,
          ] = await contractRegistry.getContractNameAndHashAtProxy.call(
            tokenV0Proxy.address
          );
          assert.equal(
            tokenName,
            'UnstructuredUpgradeableToken',
            'Wrong contract name returned'
          );
          assert.equal(
            tokenNameHash,
            web3.sha3('UnstructuredUpgradeableToken'),
            'Wrong contract name hash returned'
          );
        });
      });
      describe('getContractInfoForVersion', () => {
        it('should get the contract info using a version name', async () => {
          const [
            versionIndex,
            versionName,
            versionImp,
            versionProxy,
          ] = await contractRegistry.getContractInfoForVersion.call(
            'UnstructuredUpgradeableToken',
            '0_3_0'
          );
          assert.equal(
            versionIndex.toString(),
            3,
            'Wrong contract version index returned'
          );
          assert.equal(
            versionName,
            '0_3_0',
            'Wrong contract version name returned'
          );
          assert.equal(
            versionImp,
            tokenV2Imp.address,
            'Wrong contract version implementation address returned'
          );
          assert.equal(
            versionProxy,
            tokenV0Proxy.address,
            'Wrong contract version proxy address returned'
          );
        });
      });
      describe('getVersionCountForContract', () => {
        it('should get the token proxy', async () => {
          const count = await contractRegistry.getVersionCountForContract.call(
            'UnstructuredUpgradeableToken',
            tokenV0Proxy.address
          );
          assert.equal(count, 4, 'Wrong contract version count returned');
        });
      });
    });

    context('Test modifiers', () => {
      describe('onlyProxy', () => {
        // The reverse of the following (where a proxy is the caller) is inherently passing if it has gotten this far
        it('should not let a user call a function with the onlyProxy modifier', async () => {
          await assertRevert(
            contractRegistry.setVersion(
              'UnstructuredUpgradeableToken',
              tokenV0Proxy.address,
              '0_4_0',
              tokenV0Imp.address
            )
          );
        });
      });
    });

    context(
      'Upgrade a token at two different proxies which use the same registry',
      () => {
        it('should maintain separate history for each contract proxy in the same registry', async () => {
          const firstImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            1
          );
          const secondImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            2
          );
          const thirdImp = await contractRegistry.getVersionForContractName(
            'UnstructuredUpgradeableToken',
            3
          );
          assert.equal(
            firstImp[1],
            tokenV0Imp.address,
            'Expected the first implementation to be the V0 implementation'
          );
          assert.equal(
            firstImp[0],
            versionName0,
            'Expected the first version to be 0_1_0'
          );
          assert.equal(
            secondImp[1],
            tokenV1Imp.address,
            'Expected the second implementation to be the V1 implementation'
          );
          assert.equal(
            secondImp[0],
            versionName1,
            'Expected the second version to be 0_2_0'
          );
          assert.equal(
            thirdImp[1],
            tokenV2Imp.address,
            'Expected the third implementation to be the V2 implementation'
          );
          assert.equal(
            thirdImp[0],
            versionName2,
            'Expected the third version to be 0_3_0'
          );
          const currentNoriImp = await contractRegistry.getVersionForContractName(
            'Nori',
            -1
          );
          assert.equal(
            currentNoriImp[1],
            noriImp.address,
            'Expected the current nori implementation to be the nori address'
          );
        });
      }
    );
  });
};

module.exports = { testVersionRegistryFunctions };
