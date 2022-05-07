import { Logger, LogLevel } from '@ethersproject/logger';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  deploySupplierLockedNORIContract,
  finalizeDeployments,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`deploySupplierLockedNORI`);
  const contract = await deploySupplierLockedNORIContract({
    hre,
  });
  await finalizeDeployments({
    hre,
    contracts: { SupplierLockedNORI: contract },
  });
};

export default deploy;
deploy.tags = ['SupplierLockedNORI', 'market'];
deploy.dependencies = ['preconditions', 'BridgedPolygonNORI'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
