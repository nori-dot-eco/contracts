import type { HardhatUserConfig } from 'hardhat/types';

const { DEFENDER_API_KEY, DEFENDER_API_SECRET } = process.env;

export const defender: HardhatUserConfig['defender'] =
  DEFENDER_API_KEY && DEFENDER_API_SECRET
    ? {
        apiKey: DEFENDER_API_KEY,
        apiSecret: DEFENDER_API_SECRET,
      }
    : undefined;
