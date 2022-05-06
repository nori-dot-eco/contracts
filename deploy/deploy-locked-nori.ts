import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployLockedNORIContract, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`deployLockedNORI`);
  const contract = await deployLockedNORIContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { LockedNORI: contract } });
};

export default deploy;
deploy.tags = ['LockedNORI', 'assets'];
deploy.dependencies = ['preconditions', 'BridgedPolygonNORI'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
