import type { HardhatUserConfig } from 'hardhat/types';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

export const etherscan: HardhatUserConfig['etherscan'] = ETHERSCAN_API_KEY
  ? {
      apiKey: ETHERSCAN_API_KEY,
    }
  : undefined;
