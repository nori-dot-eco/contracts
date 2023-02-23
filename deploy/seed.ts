import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import { seedContracts } from '@/utils/deploy';
import { getContractsFromDeployments } from '@/utils/contracts';

export const deploy: DeployFunction = async (hre) => {
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`seed`);
  const contracts = await getContractsFromDeployments(hre);
  await seedContracts({ hre, contracts });
};

export default deploy;
deploy.tags = ['seed'];
deploy.dependencies = ['assets', 'market'];
deploy.skip = async (hre) =>
  Promise.resolve(process.env.REPORT_GAS === true || hre.network.live === true);
