import 'tsconfig-paths/register';
import '@/config/environment';
import '@/plugins';

import type { HardhatUserConfig } from 'hardhat/types';

import { etherscan } from '@/config/etherscan';
import { tenderly } from '@/config/tenderly';
import { networks } from '@/config/networks';
import { namedAccountIndices } from '@/config/accounts';
import { defender } from '@/config/defender';
import { gasReporter } from '@/config/gas-reporter';
import { solidity } from '@/config/solidity';
import { docgen } from '@/config/docgen';
import { mocha } from '@/config/mocha';
import { fireblocks } from '@/config/fireblocks';

export const config: HardhatUserConfig = {
  tenderly,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  docgen,
  namedAccounts: namedAccountIndices,
  networks,
  etherscan,
  defender,
  gasReporter,
  solidity,
  mocha,
  fireblocks,
};

export default config;
