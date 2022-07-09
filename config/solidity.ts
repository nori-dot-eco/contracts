import type { HardhatUserConfig } from 'hardhat/types';

export const solidity2: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.15',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000,
        },
      },
    },
  ],
};

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.15',
      settings: {
        viaIR: process.env.VIA_IR && !process.env.CI,
        ...(!process.env.CI && {
          optimizer: {
            enabled: process.env.OPTIMIZER,
            runs: 1,
          },
        }),
      },
    },
  ],
};
