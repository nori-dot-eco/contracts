import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { finalizeDeployments, deployCertificateContract } from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`deployCertificate`);
  const contract = await deployCertificateContract({
    hre,
  });
  await finalizeDeployments({ hre, contracts: { Certificate: contract } });
};

export default deploy;
deploy.tags = ['Certificate', 'market'];
deploy.dependencies = ['preconditions'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
