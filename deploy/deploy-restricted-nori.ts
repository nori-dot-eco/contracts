import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { getRemoval } from '../utils/contracts';

import { deployRestrictedNORI, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deployRestrictedNORI`);
  const contract = await deployRestrictedNORI({
    hre,
  });
  const [signer] = await hre.getSigners();
  const removal = await getRemoval({ hre, signer });
  if (
    !(await contract.hasRole(
      await contract.SCHEDULE_CREATOR_ROLE(),
      removal.address
    ))
  ) {
    await contract.grantRole(
      hre.ethers.utils.id('SCHEDULE_CREATOR_ROLE'),
      removal.address
    );
  }
  hre.trace("Granted Removal the role 'SCHEDULE_CREATOR_ROLE'");
  await finalizeDeployments({ hre, contracts: { RestrictedNORI: contract } });
};

export default deploy;
deploy.tags = ['RestrictedNORI', 'market'];
deploy.dependencies = ['preconditions', 'Removal', 'BridgedPolygonNORI'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
