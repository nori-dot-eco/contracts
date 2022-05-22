import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { finalizeDeployments, deployRemovalTestHarness } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-removal-test-harness`);
  const contract = await deployRemovalTestHarness({
    hre,
  });
  await finalizeDeployments({
    hre,
    contracts: { RemovalTestHarness: contract },
  });
};

export default deploy;
deploy.tags = ['RemovalUtilsTestHarness', 'test'];
deploy.dependencies = ['preconditions', 'seed'];
deploy.skip = async (hre) =>
  Promise.resolve(!['localhost', 'hardhat'].includes(hre.network.name));
