import type { HardhatUserConfig } from 'hardhat/types';

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.15',
      settings: {
        optimizer: {
          enabled: true,
          runs: 5_000_000,
        },
      },
    },
  ],
};
