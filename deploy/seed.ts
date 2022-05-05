import { Logger } from 'ethers/lib/utils';
import { seedContracts } from '@/utils/deploy';
import { LogLevel } from '@ethersproject/logger';
import { getContractsFromDeployments } from '@/test/helpers/index';

export const deploy: CustomHardhatDeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`seed`);
  const contracts = await getContractsFromDeployments(hre);
  await seedContracts({ hre, contracts });
};

export default deploy;
deploy.tags = ['seed'];
deploy.runAtTheEnd = true;
