import {
  configureDeploymentSettings,
  validateDeployment,
  verifyContracts,
  writeContractsConfig,
  pushContractsToEthernal,
  deployContracts,
  seedContracts,
  addContractsToDefender,
  saveDeployments,
} from '@/utils/deploy';
import { Logger, LogLevel } from '@ethersproject/logger';

export const deploy: CustomHardhatDeployFunction = async (env) => {
  const hre: CustomHardHatRuntimeEnvironment = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  console.log(`0_deploy_nori_token_and_vesting`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const contracts = await deployContracts({ hre, contractNames: ['NORI', 'BridgedPolygonNORI', 'LockedNORI'] });
  await seedContracts({ hre, contracts });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
  await saveDeployments({ hre, contracts });
};

export default deploy;
deploy.tags = ['assets', 'NORI', 'BridgedPolygonNORI', 'LockedNORI'];
