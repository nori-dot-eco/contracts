import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  configureDeploymentSettings,
  validateDeploymentSettings,
  resetEthernalWorkspace,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (hre) => {
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`preconditions`);
  validateDeploymentSettings({ hre });
  await resetEthernalWorkspace({ hre });
  await configureDeploymentSettings({ hre });
};

export default deploy;
deploy.tags = ['preconditions'];
