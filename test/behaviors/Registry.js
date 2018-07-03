import {
  UnstructuredUpgradeableTokenV0,
  ContractRegistryV0_1_0,
  RootRegistryV0_1_0,
  UnstructuredOwnedUpgradeabilityProxy,
} from '../helpers/Artifacts';
import { getLogs, deployUpgradeableContract } from '../helpers/contracts';
import { upgradeToV0 } from './UnstructuredUpgrades';

// todo rename to contractregistry.js
const testContractAtRegistry = (admin, initParams = []) => {
  context(
    'Create a contract object by getting an address from the registry and then calling .at() on it',
    () => {
      it('should be able to call contract functions', async () => {
        const [, , tokenProxy, registry] = await upgradeToV0(admin);
        const [, , tokenProxyAddr] = await registry.getVersionForContractName(
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

const testEvents = admin => {
  let versionSetLogs;
  let initLogs;
  let regImp;
  let registryAtProxyV0;
  let registryProxy;
  let rootRegistryAtProxy;
  let ownerLogs;
  let registrySetLogs;
  let upOwnerSetLogs;
  let contractRegistryProxy;
  let implementationPositionSetLogs;
  let rootProxy;
  let rootImp;

  context('Upgrade a contract', () => {
    beforeEach(async () => {
      [
        rootImp,
        rootRegistryAtProxy,
        rootProxy,
      ] = await deployUpgradeableContract(
        artifacts,
        null,
        RootRegistryV0_1_0,
        null,
        [['address'], [admin]],
        { from: admin }
      );
      implementationPositionSetLogs = await getLogs(
        rootProxy.ImplementationPositionSet
      );
      contractRegistryProxy = await UnstructuredOwnedUpgradeabilityProxy.new(
        rootRegistryAtProxy.address
      );
      upOwnerSetLogs = await getLogs(
        contractRegistryProxy.UpgradeabilityOwnerSet
      );

      registrySetLogs = await getLogs(contractRegistryProxy.RegistryAddrSet);

      [, registryAtProxyV0, registryProxy] = await deployUpgradeableContract(
        artifacts,
        contractRegistryProxy,
        ContractRegistryV0_1_0,
        rootRegistryAtProxy,
        [['address'], [admin]],
        { from: admin }
      );

      regImp = await registryProxy.implementation();
      versionSetLogs = await getLogs(rootRegistryAtProxy.VersionSet);

      initLogs = await getLogs(registryAtProxyV0.Initialized);
      ownerLogs = await getLogs(registryAtProxyV0.OwnerSet);
    });

    describe('VersionSet event', () => {
      it('should put a VersionSet event into the logs', () => {
        assert.equal(
          versionSetLogs.length,
          1,
          'Expected one VersionSet event to have been sent'
        );
      });
      it("should include a 'contractName' arg", () => {
        assert.equal(
          versionSetLogs[0].args.contractName,
          'ContractRegistry',
          'Expected VersionSet Event "contractName" arg to be ContractRegistry'
        );
      });
      it("should include an 'proxyAddress' arg", () => {
        assert.equal(
          versionSetLogs[0].args.proxyAddress.toString(),
          registryAtProxyV0.address,
          'Expected VersionSet Event "proxyAddress" arg to be the registryAtProxyV0 address'
        );
      });
      it("should include an 'versionName' arg", () => {
        assert.equal(
          versionSetLogs[0].args.versionName.toString(),
          '0_1_0',
          'Expected VersionSet Event "versionName" arg to be 0_1_0'
        );
      });
      it("should include an 'newImplementation' arg", () => {
        assert.equal(
          versionSetLogs[0].args.newImplementation.toString(),
          regImp,
          'Expected VersionSet Event "newImplementation" arg to be the registry proxys newest implementation'
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
        });
        it("should include an 'owner' arg", () => {
          assert.equal(
            initLogs[0].args.owner,
            admin,
            'Expected Initialized Event "newImplementation" arg to be the admin account'
          );
        });
      });
      context(
        'Events triggered because of initialization but not a core part of Registry',
        () => {
          describe('OwnerSet event', () => {
            it('should put a OwnerSet event into the logs', () => {
              assert.equal(
                ownerLogs.length,
                1,
                'Expected one OwnerSet event to have been sent'
              );
            });
            it("should include an 'newOwner' arg", () => {
              assert.equal(
                ownerLogs[0].args.newOwner,
                admin,
                'Expected OwnerSet Event "newOwner" arg to be the admin account'
              );
            });
          });
          describe('ImplementationPositionSet event', () => {
            it('should put a ImplementationPositionSet event into the logs', () => {
              assert.equal(
                implementationPositionSetLogs.length,
                1,
                'Expected one ImplementationPositionSet event to have been sent'
              );
            });
            it("should include an 'impPosition' arg", () => {
              assert.equal(
                implementationPositionSetLogs[0].args.impPosition,
                rootImp.address,
                'Expected ImplementationPositionSet Event "impPosition" arg to be the root registry implementation address'
              );
            });
          });
          describe('RegistryAddrSet event', () => {
            it('should put a RegistryAddrSet event into the logs', () => {
              assert.equal(
                registrySetLogs.length,
                1,
                'Expected one RegistryAddrSet event to have been sent'
              );
            });
            it("should include an 'registryAddress' arg", () => {
              assert.equal(
                registrySetLogs[0].args.registryAddress,
                rootRegistryAtProxy.address,
                'Expected RegistryAddrSet Event "registryAddress" arg to be the registry address'
              );
            });
          });
          describe('SetUpgradeabilityOwner event', () => {
            it('should put a SetUpgradeabilityOwner event into the logs', () => {
              assert.equal(
                upOwnerSetLogs.length,
                1,
                'Expected one SetUpgradeabilityOwner event to have been sent'
              );
            });
            it("should include an 'upgradeabilityOwner' arg", () => {
              assert.equal(
                upOwnerSetLogs[0].args.upgradeabilityOwner,
                admin,
                'Expected SetUpgradeabilityOwner Event "upgradeabilityOwner" arg to be the admin'
              );
            });
          });
        }
      );
    });
  });
};

module.exports = {
  testContractAtRegistry,
  testEvents,
};
