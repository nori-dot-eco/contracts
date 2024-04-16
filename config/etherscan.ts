import type { HardhatUserConfig } from 'hardhat/types';

const { ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY } = process.env;

const apiKeysAreDefined =
  typeof ETHERSCAN_API_KEY === 'string' &&
  typeof POLYGONSCAN_API_KEY === 'string';

export const etherscan: HardhatUserConfig['etherscan'] = apiKeysAreDefined
  ? {
      apiKey: {
        amoy: POLYGONSCAN_API_KEY,
        polygon: POLYGONSCAN_API_KEY,
        mainnet: ETHERSCAN_API_KEY,
        goerli: ETHERSCAN_API_KEY,
      },
      customChains: [
        {
          network: 'amoy',
          chainId: 80_002,
          urls: {
            apiURL: 'https://api-amoy.polygonscan.com/api',
            browserURL: 'https://amoy.polygonscan.com',
          },
        },
      ],
    }
  : undefined;
