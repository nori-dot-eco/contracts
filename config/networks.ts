import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, INFURA_PROD_KEY, MNEMONIC, LOG_HARDHAT_NETWORK } =
  process.env;

const hardhat: NetworksUserConfig['hardhat'] = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 3,
  chainId: 9001,
  accounts,
  loggingEnabled: LOG_HARDHAT_NETWORK,
  allowUnlimitedContractSize: true,
  tags: ['test'],
  saveDeployments: true,
};

const localhost: NetworkUserConfig = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 3,
  chainId: 9001,
  ...(typeof MNEMONIC === 'string' && {
    accounts: { mnemonic: MNEMONIC },
  }),
  loggingEnabled: LOG_HARDHAT_NETWORK,
  url: 'http://127.0.0.1:8545',
  tags: ['test'],
  saveDeployments: true,
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
  gas: 2_100_000,
  gasPrice: 8_000_000_000,
  live: true,
  tags: ['mainnet', 'staging'],
};

const mumbai: NetworkUserConfig = {
  chainId: 80_001,
  url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
  gasPrice: 35_000_000_000,
  live: true,
  tags: ['polygon', 'staging'],
};

const polygon: NetworkUserConfig = {
  chainId: 137,
  url: `https://polygon-mainnet.infura.io/v3/${INFURA_PROD_KEY}`,
  gasPrice: 50_000_000_000,
  live: true,
  tags: ['polygon', 'prod'],
};

const mainnet: NetworkUserConfig = {
  chainId: 1,
  url: `https://mainnet.infura.io/v3/${INFURA_PROD_KEY}`,
  gasPrice: 50_000_000_000,
  live: true,
  tags: ['mainnet', 'prod'],
};

export const networks = {
  hardhat,
  ...(Boolean(MNEMONIC) && { localhost }),
  ...(Boolean(INFURA_STAGING_KEY) && { goerli, mumbai }),
  ...(Boolean(INFURA_STAGING_KEY) && { mainnet, polygon }),
} as const;
