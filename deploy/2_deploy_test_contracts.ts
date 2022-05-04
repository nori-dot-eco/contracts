import { Logger, LogLevel } from '@ethersproject/logger';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  configureDeploymentSettings,
  validateDeployment,
  verifyContracts,
  writeContractsConfig,
  pushContractsToEthernal,
  deployTestContracts,
  seedContracts,
  addContractsToDefender,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre: CustomHardHatRuntimeEnvironment =
    env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`2_deploy_test_contracts`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const contracts = await deployTestContracts({
    hre,
    contractNames: ['ScheduleTestHarness'],
  });
  await seedContracts({ hre, contracts });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
};

export default deploy;
deploy.tags = ['test', 'ScheduleTestHarness'];
