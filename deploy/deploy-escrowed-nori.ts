import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { deployEscrowedNORI, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deployEscrowedNORI`);
  const contract = await deployEscrowedNORI({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { EscrowedNORI: contract } });
};

export default deploy;
deploy.tags = ['EscrowedNORI', 'market'];
deploy.dependencies = ['preconditions', 'Removal', 'BridgedPolygonNORI'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
