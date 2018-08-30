/* globals network */
import { getLogs } from '../helpers/contracts';
import { setupEnvForTests } from '../helpers/utils';

const {
  contractRegistryConfig,
  noriConfig,
} = require('../helpers/contractConfigs');
const getNamedAccounts = require('../helpers/getNamedAccounts');
const { getLatestVersionFromFs } = require('../helpers/contracts');

const testContractAtRegistry = (admin, initParams = [], allAccounts) => {
  let contractRegistry, nori;
  context(
    'Create a contract object by getting an address from the registry and then calling .at() on it',
    () => {
      beforeEach(async () => {
        ({
          deployedContracts: [
            { upgradeableContractAtProxy: contractRegistry },
            { upgradeableContractAtProxy: nori },
          ],
        } = await setupEnvForTests(
          [contractRegistryConfig, noriConfig],
          getNamedAccounts(web3).admin0,
          { network, artifacts, accounts: allAccounts, web3 }
        ));
      });
      it('should be able to call contract functions', async () => {
        const [
          ,
          ,
          tokenProxyAddr,
        ] = await contractRegistry.getVersionForContractName('Nori', -1);
        assert.equal(nori.address, tokenProxyAddr);
        const tokenAtRegistry = await artifacts
          .require(`./NoriV${await getLatestVersionFromFs('Nori')}`)
          .at(tokenProxyAddr);
        const name = await tokenAtRegistry.name();
        assert.equal(name, 'Upgradeable NORI Token');
      });
    }
  );
};

const testEvents = (admin, allAccounts) => {
  let contractRegistry,
    implementationPositionSetLogs,
    upOwnerSetLogs,
    initLogs,
    versionSetLogs,
    registrySetLogs,
    multiAdmin,
    rootRegistry,
    registryProxy,
    registryImp;

  context('Upgrade a contract', () => {
    beforeEach(async () => {
      ({
        multiAdmin,
        rootRegistry,
        deployedContracts: [
          {
            proxy: registryProxy,
            upgradeableContractAtProxy: contractRegistry,
            contractToMakeUpgradeable: registryImp,
          },
        ],
      } = await setupEnvForTests(
        [contractRegistryConfig],
        getNamedAccounts(web3).admin0,
        { network, artifacts, accounts: allAccounts, web3 }
      ));

      versionSetLogs = await getLogs(rootRegistry.VersionSet);
      initLogs = await getLogs(contractRegistry.Initialized);
      implementationPositionSetLogs = await getLogs(
        registryProxy.ImplementationPositionSet
      );
      upOwnerSetLogs = await getLogs(
        registryProxy.UpgradeabilityOwnerSet,
        {},
        { fromBlock: 0, toBlock: 'latest' }
      );
      registrySetLogs = await getLogs(
        registryProxy.RegistryAddrSet,
        {},
        { fromBlock: 0, toBlock: 'latest' }
      );
    });

    describe('VersionSet event', () => {
      it('should put a VersionSet event into the logs', async () => {
        const {
          contractName,
          proxyAddress,
          newImplementation,
          versionName,
        } = versionSetLogs[0].args;
        assert.equal(
          versionSetLogs.length,
          1,
          'Expected one VersionSet event to have been sent'
        );
        assert.equal(
          contractName,
          'ContractRegistry',
          'Expected VersionSet Event "contractName" arg to be Nori'
        );
        assert.equal(
          proxyAddress.toString(),
          contractRegistry.address,
          'Expected VersionSet Event "proxyAddress" arg to be the nori proxy address'
        );
        assert.equal(
          versionName.toString(),
          `${await getLatestVersionFromFs('ContractRegistry')}`,
          `Expected VersionSet Event "versionName" arg to be ${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        );
        assert.equal(
          newImplementation.toString(),
          await registryProxy.implementation.call(),
          "Expected VersionSet Event 'newImplementation' arg to be the registry proxy's newest implementation"
        );
      });
    });
    context('Initialization', () => {
      describe('Initialized event', () => {
        it('should put a Initialized event into the logs', () => {
          assert.equal(
            initLogs.length,
            1,
            'Expected one Initialized event to have been sent'
          );
          assert.equal(
            initLogs[0].args.owner,
            multiAdmin.address,
            'Expected Initialized Event "newImplementation" arg to be the admin account'
          );
          context(
            'Events triggered because of initialization but not a core part of Registry',
            () => {
              describe('ImplementationPositionSet event', () => {
                assert.equal(
                  implementationPositionSetLogs.length,
                  1,
                  'Expected one ImplementationPositionSet event to have been sent'
                );
                assert.equal(
                  implementationPositionSetLogs[0].args.impPosition,
                  registryImp.address,
                  'Expected ImplementationPositionSet Event "impPosition" arg to be the contract registry implementation address'
                );
              });
              describe('RegistryAddrSet event', () => {
                assert.equal(
                  registrySetLogs.length,
                  1,
                  'Expected one RegistryAddrSet event to have been sent'
                );
                assert.equal(
                  registrySetLogs[0].args.registryAddress,
                  rootRegistry.address,
                  'Expected RegistryAddrSet Event "registryAddress" arg to be the root registry address'
                );
              });
              describe('SetUpgradeabilityOwner event', () => {
                assert.equal(
                  upOwnerSetLogs.length,
                  2,
                  'Expected one SetUpgradeabilityOwner event to have been sent'
                );
                assert.equal(
                  upOwnerSetLogs[0].args.upgradeabilityOwner,
                  admin,
                  'Expected SetUpgradeabilityOwner Event "upgradeabilityOwner" arg to be the admin'
                );
                assert.equal(
                  upOwnerSetLogs[1].args.upgradeabilityOwner,
                  multiAdmin.address,
                  'Expected SetUpgradeabilityOwner Event "upgradeabilityOwner" arg to be the admin'
                );
              });
            }
          );
        });
      });
    });
  });
};

module.exports = {
  testContractAtRegistry,
  testEvents,
};
