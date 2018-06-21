import { testContractAtRegistry } from './behaviors/Registry';
import { ContractRegistryV0_1_0 } from './helpers/artifacts';
import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { testVersionRegistryFunctions } from './behaviors/VersionRegistry';

const RegistryTests = (admin0, admin1, nonAdmin) => {
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
export default RegistryTests;
