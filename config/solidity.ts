import type { HardhatUserConfig } from 'hardhat/types';

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.16',
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
    },
  ],
};
