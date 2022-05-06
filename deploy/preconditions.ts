import { Logger } from 'ethers/lib/utils';
import {
  validateDeployment,
  configureDeploymentSettings,
} from '@/utils/deploy';
import { LogLevel } from '@ethersproject/logger';

export const deploy: CustomHardhatDeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`preconditions`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
};

export default deploy;
deploy.tags = ['preconditions'];
