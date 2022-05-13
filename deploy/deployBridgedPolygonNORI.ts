import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  POLYGON_CHILD_CHAIN_MANAGER_PROXY,
  MUMBAI_CHILD_CHAIN_MANAGER_PROXY,
} from '../constants/addresses';

import {
  finalizeDeployments,
  deployBridgedPolygonNORIContract,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.log(`deployBridgedPolygonNORI`);
  const childChainManagerProxyAddress =
    hre.network.name === 'polygon'
      ? POLYGON_CHILD_CHAIN_MANAGER_PROXY
      : MUMBAI_CHILD_CHAIN_MANAGER_PROXY;
  const contract = await deployBridgedPolygonNORIContract({
    hre,
    childChainManagerProxyAddress,
  });
  await finalizeDeployments({
    hre,
    contracts: { BridgedPolygonNORI: contract },
  });
};

export default deploy;
deploy.tags = ['BridgedPolygonNORI', 'assets'];
deploy.dependencies = ['preconditions', 'seed'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
