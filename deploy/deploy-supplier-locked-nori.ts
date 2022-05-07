import { Logger, LogLevel } from '@ethersproject/logger';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  deploySupplierVestingNORIContract,
  finalizeDeployments,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`deploySupplierVestingNORI`);
  const contract = await deploySupplierVestingNORIContract({
    hre,
  });
  await finalizeDeployments({
    hre,
    contracts: { SupplierVestingNORI: contract },
  });
};

export default deploy;
deploy.tags = ['SupplierVestingNORI', 'market'];
deploy.dependencies = ['preconditions', 'BridgedPolygonNORI'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
