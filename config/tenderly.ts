import type { HardhatUserConfig } from 'hardhat/types';

const { TENDERLY_USERNAME, TENDERLY_PROJECT } = process.env;

export const tenderly: HardhatUserConfig['tenderly'] | undefined =
  TENDERLY_USERNAME && TENDERLY_PROJECT
    ? {
        username: TENDERLY_USERNAME,
        project: TENDERLY_PROJECT,
      }
    : undefined;
