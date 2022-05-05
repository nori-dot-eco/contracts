import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployNORIContract, finalizeDeployments } from '../utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`deployNORI`);
  const contract = await deployNORIContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { NORI: contract } });
};

export default deploy;
deploy.tags = ['NORI', 'assets'];
deploy.dependencies = ['preconditions'];
```suggestion
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
