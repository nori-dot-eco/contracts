import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { finalizeDeployments, deployCertificateContract } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-certificate`);
  const contract = await deployCertificateContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { Certificate: contract } });
};

export default deploy;
deploy.tags = ['Certificate', 'market'];
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'amoy', 'localhost', 'hardhat'].includes(hre.network.name)
  );
