import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { finalizeDeployments, deployRemovalContract } from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`deployRemoval`);
  const contract = await deployRemovalContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { Removal: contract } });
};

export default deploy;
deploy.tags = ['Removal', 'market'];
deploy.dependencies = ['preconditions', 'seed'];
```suggestion
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
