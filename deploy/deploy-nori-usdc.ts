import { Logger } from 'ethers/lib/utils';

import { deployNoriUSDC, finalizeDeployments } from '@/utils/deploy';

export const deploy = async (
  hre: CustomHardHatRuntimeEnvironment
): Promise<void> => {
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-nori-usdc`);
  const contract = await deployNoriUSDC({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { NoriUSDC: contract } });
};

export default deploy;
deploy.tags = ['NoriUSDC', 'assets'];
deploy.skip = async (hre: CustomHardHatRuntimeEnvironment) =>
  Promise.resolve(!['localhost', 'hardhat'].includes(hre.network.name));
