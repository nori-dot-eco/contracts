import 'tsconfig-paths/register';
import '@/config/environment';
import '@/plugins';

import type { HardhatUserConfig } from 'hardhat/types';

import { etherscan } from '@/config/etherscan';
import { tenderly } from '@/config/tenderly';
import { networks } from '@/config/networks';
import { namedAccounts } from '@/config/accounts';
import { defender } from '@/config/defender';
import { gasReporter } from '@/config/gas-reporter';
import { solidity } from '@/config/solidity';
import { docgen } from '@/config/docgen';

export const config: HardhatUserConfig = {
  tenderly,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  docgen,
  namedAccounts,
  networks,
  etherscan,
  defender,
  gasReporter,
  solidity,
  mocha: {
    parallel: !Boolean(process.env.CI),
  },
};

export default config;
