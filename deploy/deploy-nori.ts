import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { deployNORIContract, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-nori`);
  const contract = await deployNORIContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { NORI: contract } });
};

export default deploy;
deploy.tags = ['NORI', 'assets'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['mainnet', 'goerli', 'localhost', 'hardhat'].includes(hre.network.name)
  );
