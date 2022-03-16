import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, MNEMONIC, LOG_HARDHAT_NETWORK } = process.env;
const ENABLE_LOGGING = LOG_HARDHAT_NETWORK?.toLowerCase() !== 'false';

const hardhat: NetworksUserConfig['hardhat'] = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 1,
  chainId: 9001,
  accounts,
  loggingEnabled: ENABLE_LOGGING,
};

const localhost: NetworkUserConfig = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 1,
  chainId: 9001,
  accounts: { mnemonic: MNEMONIC },
  loggingEnabled: ENABLE_LOGGING,
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: MNEMONIC },
  gas: 2100000,
  gasPrice: 8000000000,
};

const mumbai: NetworkUserConfig = {
  url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: MNEMONIC },
  gasPrice: 35000000000,
};

const polygon: NetworkUserConfig = {
  url: `https://polygon.infura.io/v3/${INFURA_STAGING_KEY}`, // todo use prod key
  accounts: {
    mnemonic: MNEMONIC, // todo require fireblocks
  },
};

const mainnet: NetworkUserConfig = {
  url: `https://mainnet.infura.io/v3/${INFURA_STAGING_KEY}`, // todo use prod key
  accounts: {
    mnemonic: MNEMONIC, // todo require fireblocks
  },
};

export const networks = {
  hardhat,
  ...(Boolean(MNEMONIC) && { localhost }),
  ...(Boolean(INFURA_STAGING_KEY) && Boolean(MNEMONIC) && { goerli, mumbai }),
  ...(Boolean(INFURA_STAGING_KEY) && Boolean(MNEMONIC) && { mainnet, polygon }),
} as const;
