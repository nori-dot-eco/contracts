import { Logger } from 'ethers/lib/utils';

import {
  configureDeploymentSettings,
  validateDeploymentSettings,
} from '@/utils/deploy';

export const deploy: CustomHardhatDeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`preconditions`);
  validateDeploymentSettings({ hre });
  await configureDeploymentSettings({ hre });
};

export default deploy;
deploy.tags = ['preconditions'];
