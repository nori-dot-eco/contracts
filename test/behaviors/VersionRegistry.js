import {
  NoriV0,
  UnstructuredOwnedUpgradeabilityProxy,
  UnstructuredUpgradeableTokenV1,
  UnstructuredUpgradeableTokenV0,
  UnstructuredUpgradeableTokenV2,
} from '../helpers/Artifacts';
import { upgradeToV0 } from './UnstructuredUpgrades';
import { deployUpgradeableContract } from '../helpers/contracts';

const testVersionRegistryFunctions = (admin, nonAdmin) => {
  contract(
    'ContractRegistryV0_1_0.ContractRegistryBase.VersionRegistry',
    () => {
      let registry;
      let tokenProxy;

      beforeEach(async () => {
        [, , tokenProxy, registry] = await upgradeToV0(admin);
      });
      context('Upgrade a token at a single proxy', () => {
        it('should maintain history for all versions', async () => {
          let [
            contractName,
            versionName,
          ] = UnstructuredUpgradeableTokenV0.contractName.split('V');
          let tokenProxyImp = await tokenProxy.implementation();
          let latestImp = await registry.getVersionForContractName(
            contractName,
            -1
          );
          assert.equal(latestImp[1], tokenProxyImp);
          assert.equal(versionName, '0');

          [, , , , contractName, versionName] = await deployUpgradeableContract(
            artifacts,
            tokenProxy,
            UnstructuredUpgradeableTokenV1,
            registry,
            null,
            { from: admin }
          );

          tokenProxyImp = await tokenProxy.implementation();
          latestImp = await registry.getVersionForContractName(
            contractName,
            -1
          );
          tokenProxyImp = await tokenProxy.implementation();
          latestImp = await registry.getVersionForContractName(
            contractName,
            -1
          );
          assert.equal(latestImp[1], tokenProxyImp);
          assert.equal(versionName, '1');

          [, , , , contractName, versionName] = await deployUpgradeableContract(
            artifacts,
            tokenProxy,
            UnstructuredUpgradeableTokenV2,
            registry,
            null,
            { from: admin }
          );

          tokenProxyImp = await tokenProxy.implementation();
          latestImp = await registry.getVersionForContractName(
            contractName,
            -1
          );
          tokenProxyImp = await tokenProxy.implementation();
          latestImp = await registry.getVersionForContractName(
            contractName,
            -1
          );
          assert.equal(latestImp[1], tokenProxyImp);
          assert.equal(versionName, '2');
        });
      });

      context(
        'Upgrade a token at two different proxies which use the same registry',
        () => {
          it('should maintain seperate history for each proxy in the same registry', async () => {
            [, , tokenProxy, registry] = await upgradeToV0(admin, NoriV0);
            const firstTokenProxy = tokenProxy;
            const firstTokenProxyFirstImp = await firstTokenProxy.implementation();
            const [
              secondContractName,
            ] = UnstructuredUpgradeableTokenV0.contractName.split('V');

            const secondTokenProxy = await UnstructuredOwnedUpgradeabilityProxy.new(
              registry.address,
              {
                from: admin,
              }
            );

            await deployUpgradeableContract(
              artifacts,
              secondTokenProxy,
              UnstructuredUpgradeableTokenV0,
              registry,
              [
                ['string', 'string', 'uint', 'uint', 'address', 'address'],
                [
                  'Upgradeable NORI Token',
                  'NORI',
                  1,
                  0,
                  registry.address,
                  admin,
                ],
              ],
              { from: admin }
            );

            const secondTokenSecondFirstImp = await secondTokenProxy.implementation();

            await deployUpgradeableContract(
              artifacts,
              secondTokenProxy,
              UnstructuredUpgradeableTokenV1,
              registry,
              null,
              { from: admin }
            );
            const secondTokenSecondImp = await secondTokenProxy.implementation();

            const firstTokenFirstVersion = await registry.getVersionForContractName(
              'Nori',
              0
            );
            const secondTokenFirstVersion = await registry.getVersionForContractName(
              secondContractName,
              0
            );
            const secondTokenSecondVersion = await registry.getVersionForContractName(
              secondContractName,
              1
            );

            assert.equal(firstTokenFirstVersion[1], firstTokenProxyFirstImp);
            assert.equal(firstTokenFirstVersion[0], '0');

            assert.equal(secondTokenFirstVersion[1], secondTokenSecondFirstImp);
            assert.equal(secondTokenFirstVersion[0], '0');
            assert.equal(secondTokenSecondVersion[1], secondTokenSecondImp);
            assert.equal(secondTokenSecondVersion[0], '1');
            assert.equal(secondTokenSecondVersion[1], secondTokenSecondImp);
          });
        }
      );
    }
  );
};

module.exports = { testVersionRegistryFunctions };
