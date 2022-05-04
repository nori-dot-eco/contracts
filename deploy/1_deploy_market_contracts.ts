import { Logger, LogLevel } from '@ethersproject/logger';
import type { DeployFunction } from 'hardhat-deploy/types';

import { deployMarketContracts, saveDeployments } from '../utils/deploy';
import { getContractsFromDeployments } from '../test/helpers/index';

import {
  configureDeploymentSettings,
  validateDeployment,
  verifyContracts,
  writeContractsConfig,
  pushContractsToEthernal,
  addContractsToDefender,
} from '@/utils/deploy';

export const deploy: DeployFunction = async (env) => {
  const hre: CustomHardHatRuntimeEnvironment =
    env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`1_deploy_market_contracts`);
  validateDeployment({ hre });
  await configureDeploymentSettings({ hre });
  const dependentContracts = await getContractsFromDeployments(hre);
  const contracts = await deployMarketContracts({
    hre,
    contractNames: ['FIFOMarket', 'Certificate', 'Removal'],
    contracts: dependentContracts,
  });
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
  await saveDeployments({ hre, contracts });
};

export default deploy;
deploy.tags = ['market', 'FIFOMarket', 'Certificate', 'Removal'];
deploy.dependencies = ['assets'];
