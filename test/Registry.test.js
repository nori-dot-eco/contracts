import { testContractAtRegistry } from './behaviors/Registry';
import { ContractRegistryV0_1_0 } from './helpers/Artifacts';
import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { testVersionRegistryFunctions } from './behaviors/VersionRegistry';
import {
  shouldBehaveLikeRootRegistry,
  testRegistryUpgradeAndHistoryPreservation,
} from './behaviors/RootRegistry';

const ContractRegistryTests = (admin0, admin1, nonAdmin) => {
  contract('ContractRegistryV0_1_0', () => {
    context('Test Registry upgradeability', () => {
      UnstructuredOwnedUpgradeabilityProxyTests(
        admin0,
        nonAdmin,
        [['address'], [admin0]],
        ContractRegistryV0_1_0
      );
    });
    testContractAtRegistry(admin0, [['address'], [admin0]]);

    // todo EIP820 Registry tests

    testVersionRegistryFunctions(admin0, nonAdmin);
  });
};

const RootRegistryTests = () => {
  contract('RootRegistryV0_1_0', () => {
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
