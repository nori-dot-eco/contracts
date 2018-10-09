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
  ownedUpContract = false,
  constructorParams = null
) => {
  contract(
    ownedUpContract
      ? `${ownedUpContract.contractName}.UnstructuredOwnedUpgradeabilityProxy`
      : 'UnstructuredOwnedUpgradeabilityProxy',
    () => {
      testUnstructuredOwnedUpgradeabilityProxyInitialState(
        admin,
        ownedUpContract,
        initParams,
        constructorParams
      );
      testUnstructuredOwnedUpgradeabilityProxyFuncs(
        admin,
        ownedUpContract,
        initParams,
        constructorParams
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
