import {
  testEvents,
  testUnstructuredOwnedUpgradeabilityProxyFuncs,
  testUnstructuredOwnedUpgradeabilityProxyImplementer,
  testOnlyProxyOwnerUnstructuredOwnedUpgradeabilityProxyFuncs,
  testUnstructuredOwnedUpgradeabilityProxyInitialState,
} from './behaviors/UnstructuredOwnedUpgradeabilityProxy';

const UnstructuredOwnedUpgradeabilityProxyTests = (
  admin,
  proposedAdmin,
  initParams,
  ownedUpContract = false
) => {
  contract(
    ownedUpContract
      ? `${ownedUpContract.contractName}.UnstructuredOwnedUpgradeabilityProxy`
      : 'UnstructuredOwnedUpgradeabilityProxy',
    () => {
      testUnstructuredOwnedUpgradeabilityProxyInitialState(
        admin,
        ownedUpContract,
        initParams
      );
      testUnstructuredOwnedUpgradeabilityProxyFuncs(
        admin,
        ownedUpContract,
        initParams
      );
      testOnlyProxyOwnerUnstructuredOwnedUpgradeabilityProxyFuncs(
        admin,
        proposedAdmin,
        ownedUpContract,
        initParams
      );
      testEvents(admin, proposedAdmin, ownedUpContract);
      testUnstructuredOwnedUpgradeabilityProxyImplementer(
        admin,
        proposedAdmin,
        ownedUpContract,
        initParams
      );
    }
  );
};
export default UnstructuredOwnedUpgradeabilityProxyTests;
