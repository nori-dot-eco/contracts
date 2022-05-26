import { Logger } from 'ethers/lib/utils'; // todo what's the difference between this and import {logger} from 'ethers'
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  finalizeDeployments,
  deployBridgedPolygonNORIContract,
} from '@/utils/deploy';
import {
  POLYGON_CHILD_CHAIN_MANAGER_PROXY,
  MUMBAI_CHILD_CHAIN_MANAGER_PROXY,
} from '@/constants/addresses';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deployBridgedPolygonNORI`);
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
