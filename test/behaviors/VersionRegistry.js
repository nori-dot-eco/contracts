/* globals network */
import { setupEnvForTests } from '../helpers/utils';

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
      noriImp;
    beforeEach(async () => {
      ({
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
    context('Upgrade a token at a single proxy', () => {
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
