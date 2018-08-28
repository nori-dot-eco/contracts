import { testContractAtRegistry, testEvents } from './behaviors/Registry';
import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { testVersionRegistryFunctions } from './behaviors/VersionRegistry';
import {
  shouldBehaveLikeRootRegistry,
  testRegistryUpgradeAndHistoryPreservation,
} from './behaviors/RootRegistry';
import { getLatestVersionFromFs } from './helpers/contracts';

const ContractRegistryTests = (admin0, admin1, nonAdmin, allAccounts) => {
  contract('ContractRegistry', () => {
    context('Test Registry upgradeability', async () => {
      UnstructuredOwnedUpgradeabilityProxyTests(
        admin0,
        nonAdmin,
        [['address'], [admin0]],
        await artifacts.require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
      );
    });
    testContractAtRegistry(admin0, [['address'], [admin0]], allAccounts);
    // todo EIP820 Registry tests
    testVersionRegistryFunctions(admin0, nonAdmin);
    testEvents(admin0, allAccounts);
  });
};

const RootRegistryTests = () => {
  contract('RootRegistry', () => {
    context('Test Contract Registry upgradeability', () => {
      // upgradeability tests
      shouldBehaveLikeRootRegistry();
      // history preservation integration/behavior tests
      testRegistryUpgradeAndHistoryPreservation();
    });
  });
};
module.exports = {
  ContractRegistryTests,
  RootRegistryTests,
};
