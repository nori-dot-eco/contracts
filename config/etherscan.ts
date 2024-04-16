import type { HardhatUserConfig } from 'hardhat/types';

const { ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY } = process.env;

const apiKeysAreDefined =
  typeof ETHERSCAN_API_KEY === 'string' &&
  typeof POLYGONSCAN_API_KEY === 'string';

export const etherscan: HardhatUserConfig['etherscan'] = apiKeysAreDefined
  ? {
      apiKey: {
        polygon: POLYGONSCAN_API_KEY,
        mainnet: ETHERSCAN_API_KEY,
        goerli: ETHERSCAN_API_KEY,
      },
    }
  : undefined;
