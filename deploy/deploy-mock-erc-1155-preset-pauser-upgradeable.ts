import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  finalizeDeployments,
  deployMockERC1155PresetPausableNonTransferrable,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-mock-erc-1155-preset-pauser-upgradeable`);
  const contract = await deployMockERC1155PresetPausableNonTransferrable({
    hre,
  });
  await finalizeDeployments({
    hre,
    contracts: { MockERC1155PresetPausableNonTransferrable: contract },
  });
};

export default deploy;
deploy.tags = ['MockERC1155PresetPausableNonTransferrable', 'test'];
deploy.dependencies = ['preconditions', 'seed'];
deploy.skip = async (hre) =>
  Promise.resolve(!['localhost', 'hardhat'].includes(hre.network.name));
