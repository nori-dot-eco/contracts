import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { deployNoriUSDC, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-nori-usdc`);
  const contract = await deployNoriUSDC({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { NoriUSDC: contract } });
};

export default deploy;
deploy.tags = ['NoriUSDC', 'assets'];
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
