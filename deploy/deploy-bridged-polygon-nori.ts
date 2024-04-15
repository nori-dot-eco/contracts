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

// TODO: we should remove this functionality, otherwise we have to set up
// another bridge contract for the new amoy network via the polygon team, which
// is wasted work until/unless the NORI token is back on the roadmap.
export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-bridged-polygon-nori`);
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
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'amoy', 'localhost', 'hardhat'].includes(hre.network.name)
  );
