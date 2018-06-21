import { UnstructuredUpgradeableTokenV0 } from '../helpers/artifacts';

import { upgradeToV0 } from './UnstructuredUpgrades';

const testContractAtRegistry = (admin, initParams = []) => {
  context(
    'Create a contract object by getting an address from the registry and then calling .at() on it',
    () => {
      it('should be able to call contract functions', async () => {
        const [, , tokenProxy, registry] = await upgradeToV0(admin);
        const [
          ,
          ,
          tokenProxyAddr,
        ] = await registry.getLatestVersionByContractName(
          'UnstructuredUpgradeableToken',
          -1,
          {
            from: admin,
          }
        );

        assert.equal(tokenProxy.address, tokenProxyAddr);
        const tokenAtRegistry = await UnstructuredUpgradeableTokenV0.at(
          tokenProxyAddr
        );
        const name = await tokenAtRegistry.name();
        assert.equal(name, 'Upgradeable NORI Token');
      });
    }
  );
};

module.exports = {
  testContractAtRegistry,
};
