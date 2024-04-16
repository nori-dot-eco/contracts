import type { HardhatUserConfig } from 'hardhat/types';

const { OKLINK_EXPLORER_API_KEY } = process.env;

const apiKeysAreDefined = typeof OKLINK_EXPLORER_API_KEY === 'string';

export const oklink: HardhatUserConfig['oklink'] = apiKeysAreDefined
  ? {
      apiKey: {
        amoy: OKLINK_EXPLORER_API_KEY,
      },
      customChains: [
        {
          network: 'amoy',
          chainId: 80_002,
          urls: {
            apiURL:
              'https://www.oklink.com/api/explorer/v1/polygonamoy/contract/verify/async',
            browserURL: 'https://www.oklink.com/polygonAmoy',
          },
        },
      ],
    }
  : undefined;
