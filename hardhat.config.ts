import 'tsconfig-paths/register';
import 'hardhat-preprocessor';
import '@/config/environment';
import '@/plugins';
import '@foundry-rs/hardhat';

import type { HardhatUserConfig } from 'hardhat/types';

import { etherscan } from '@/config/etherscan';
import { tenderly } from '@/config/tenderly';
import { networks } from '@/config/networks';
import { namedAccountIndices } from '@/config/accounts';
import { defender } from '@/config/defender';
import { getEthernalConfig } from '@/config/ethernal';
import { getGasReporterConfig } from '@/config/gas-reporter';
import { solidity } from '@/config/solidity';
import { docgen } from '@/config/docgen';
import { getMochaConfig } from '@/config/mocha';
import { fireblocks } from '@/config/fireblocks';
import { preprocess } from '@/config/preprocess';

export const getConfig = (
  environment: NodeJS.ProcessEnv = process.env
): HardhatUserConfig => {
  const config: HardhatUserConfig = {
    tenderly,
    docgen,
    namedAccounts: namedAccountIndices,
    networks,
    etherscan,
    defender,
    gasReporter: getGasReporterConfig(environment), // todo getters for all configs
    solidity,
    mocha: getMochaConfig(environment),
    fireblocks,
    ethernal: getEthernalConfig(environment),
    preprocess,
    paths: {
        sources: "./src",
        cache: "./cache_hardhat",
    },
  };
  return config;
};

export const config = getConfig();

export default config;
