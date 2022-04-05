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
import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';

export const deploy: DeployFunction = async (env) => {
  const hre: CustomHardHatRuntimeEnvironment = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  console.log(`2_deploy_test_contracts`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const contracts = await deployContracts({ hre, contracts: ['ScheduleTestHarness']});
  await seedContracts({ hre, contracts });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
};

export default deploy;
deploy.tags = ['test', 'ScheduleTestHarness'];
