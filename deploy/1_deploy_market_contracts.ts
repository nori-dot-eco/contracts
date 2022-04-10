import {
  configureDeploymentSettings,
  validateDeployment,
  verifyContracts,
  writeContractsConfig,
  pushContractsToEthernal,
  seedContracts,
  addContractsToDefender,
} from '@/utils/deploy';
import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployMarketContracts, Contracts, saveDeployments } from '../utils/deploy';
import { getContractsFromDeployments } from '../test/helpers/index';

export const deploy: DeployFunction = async (env) => {
  const hre: CustomHardHatRuntimeEnvironment = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  console.log(`1_deploy_market_contracts`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const dependentContracts = await getContractsFromDeployments(hre);
  const contracts = await deployMarketContracts({ hre, contractNames: ['FIFOMarket', 'Certificate', 'Removal'], contracts: dependentContracts });
  await seedContracts({ hre, contracts });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
  await saveDeployments({ hre, contracts });
};

export default deploy;
deploy.tags = ['market', 'FIFOMarket', 'Certificate', 'Removal'];
deploy.dependencies = ['assets'];
// deploy.skip = async (hre) => true;