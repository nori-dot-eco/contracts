import { testContractAtRegistry, testEvents } from './behaviors/Registry';
import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { testContractRegistryBaseFunctions } from './behaviors/ContractRegistryBase';
import {
  shouldBehaveLikeRootRegistry,
  testRegistryUpgradeAndHistoryPreservation,
} from './behaviors/RootRegistry';
import { getLatestVersionFromFs } from './helpers/contracts';

const ContractRegistryTests = (admin0, admin1, nonAdmin, allAccounts) => {
  contract('ContractRegistry', () => {
    testContractAtRegistry(admin0, [['address'], [admin0]], allAccounts);
    testContractRegistryBaseFunctions();
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
