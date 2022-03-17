import type { HardhatUserConfig } from 'hardhat/types';

const { ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY } = process.env;

const apiKeysAreDefined =
  Boolean(ETHERSCAN_API_KEY) || Boolean(POLYGONSCAN_API_KEY);

export const etherscan: HardhatUserConfig['etherscan'] = apiKeysAreDefined
  ? {
      apiKey: {
        polygonMumbai: POLYGONSCAN_API_KEY,
        polygon: POLYGONSCAN_API_KEY,
        mainnet: ETHERSCAN_API_KEY,
        goerli: ETHERSCAN_API_KEY,
      },
    }
  : undefined;
