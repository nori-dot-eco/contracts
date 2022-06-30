import type { HardhatUserConfig } from 'hardhat/types';

const optimizer = {
    enabled: true,
    runs: 200,
  };

export const solidity: HardhatUserConfig['solidity'] = {
  compilers: [
    {
      version: '0.8.15',
      settings: {
        viaIR: true, // todo remove
        optimizer: {
          enabled: true,
          runs: 5_000_000,
        },
      },
    },
  ],
  overrides: {
  }
};
