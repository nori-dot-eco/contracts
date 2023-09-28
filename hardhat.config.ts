import 'tsconfig-paths/register';
import '@/config/environment';
import '@/plugins';
import "@fireblocks/hardhat-fireblocks";

import type { HardhatUserConfig } from 'hardhat/types';

import { etherscan } from '@/config/etherscan';
import { networks } from '@/config/networks';
import { namedAccountIndices } from '@/config/accounts';
import { defender } from '@/config/defender';
import { getEthernalConfig } from '@/config/ethernal';
import { solidity } from '@/config/solidity';
import { docgen } from '@/config/docgen';
import { fireblocks } from '@/config/fireblocks';
import { tracer } from '@/config/tracer';
import { typechain } from '@/config/typechain';

export const getConfig = (
  environment: NodeJS.ProcessEnv = process.env
): HardhatUserConfig => {
  const config: HardhatUserConfig = {
    docgen,
    namedAccounts: namedAccountIndices,
    networks,
    etherscan,
    defender,
    solidity,
    fireblocks,
    ethernal: getEthernalConfig(environment),
    paths: {
      sources: './contracts',
      cache: './cache_hardhat',
    },
    tracer,
    typechain,
    contractSizer: {
      alphaSort: true,
      disambiguatePaths: false,
      runOnCompile: true,
      strict: false,
    },
  };
  return config;
};

export const config = getConfig();

export default config;
