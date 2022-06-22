import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { deployRestrictedNORI, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-restricted-nori`);
  const contract = await deployRestrictedNORI({
    hre,
  });

  await finalizeDeployments({ hre, contracts: { RestrictedNORI: contract } });
};

export default deploy;
deploy.tags = ['RestrictedNORI', 'market'];
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
