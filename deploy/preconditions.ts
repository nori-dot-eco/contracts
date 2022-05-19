import { Logger } from 'ethers/lib/utils';

import { configureDeploymentSettings } from '@/utils/deploy';

export const deploy: CustomHardhatDeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`preconditions`);
  await configureDeploymentSettings({ hre });
};

export default deploy;
deploy.tags = ['preconditions'];
