import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { finalizeDeployments, deployMockCertificate } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-mock-certificate`);
  const contract = await deployMockCertificate({
    hre,
  });
  await finalizeDeployments({
    hre,
    contracts: { MockCertificate: contract },
  });
};

export default deploy;
deploy.tags = ['MockCertificate', 'test'];
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(!['localhost', 'hardhat'].includes(hre.network.name));
