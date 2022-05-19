import type { HardhatUserConfig } from 'hardhat/types';

const { TENDERLY_USERNAME, TENDERLY_PROJECT } = process.env;

export const tenderly: HardhatUserConfig['tenderly'] | undefined =
  typeof TENDERLY_USERNAME === 'string' && typeof TENDERLY_PROJECT === 'string'
    ? {
        username: TENDERLY_USERNAME,
        project: TENDERLY_PROJECT,
      }
    : undefined;
