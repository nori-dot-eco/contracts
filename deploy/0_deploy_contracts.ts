import {
  configureDeploymentSettings,
  validateDeployment,
  verifyContracts,
  writeContractsConfig,
  pushContractsToEthernal,
  deployContracts,
  seedContracts,
  addContractsToDefender,
} from '@/utils/deploy';

export const deploy: CustomHardhatDeployFunction = async (hre) => {
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const contracts = await deployContracts({ hre });
  await seedContracts({ hre, contracts });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
  return contracts;
};

export default deploy;
