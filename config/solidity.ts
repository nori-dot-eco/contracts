import type { HardhatUserConfig } from 'hardhat/types';

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.15',
      settings: {
        viaIR: false, // TODO get this working again process.env.VIA_IR && !process.env.CI,
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
