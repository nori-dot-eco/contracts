import type { HardhatUserConfig, SolcUserConfig } from 'hardhat/types';

const DEFAULT_SOLC_CONFIG: SolcUserConfig = {
  version: '0.8.15',
  settings: {
    viaIR: process.env.VIA_IR && !process.env.CI,
    ...(!process.env.CI && {
      optimizer: {
        enabled: process.env.OPTIMIZER,
        runs: process.env.OPTIMIZER_RUNS,
      },
    }),
    outputSelection: {
      '*': {
        '*': ['storageLayout'],
      },
    },
  },
};

const PRODUCTION_SOLC_CONFIG: SolcUserConfig = {
  ...DEFAULT_SOLC_CONFIG,
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 18_325,
    },
  },
};

const SOLC_PROFILES: Record<typeof process.env.SOLC_PROFILE, SolcUserConfig> = {
  default: DEFAULT_SOLC_CONFIG,
  production: PRODUCTION_SOLC_CONFIG,
};

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [SOLC_PROFILES[process.env.SOLC_PROFILE]],
};
