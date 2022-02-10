import type { HardhatUserConfig } from 'hardhat/types';

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.10',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  ],
};
