import { Logger } from 'ethers/lib/utils';

import { seedContracts } from '@/utils/deploy';
import { getContractsFromDeployments } from '@/utils/contracts';

export const deploy: CustomHardhatDeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`seed`);
  const contracts = await getContractsFromDeployments(hre);
  await seedContracts({ hre, contracts });
};

export default deploy;
deploy.tags = ['seed'];
deploy.runAtTheEnd = true;
