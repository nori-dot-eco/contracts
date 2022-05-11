import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, INFURA_PROD_KEY, MNEMONIC, LOG_HARDHAT_NETWORK } =
  process.env;

const hardhat: NetworksUserConfig['hardhat'] = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 2,
  chainId: 9001,
  accounts,
  loggingEnabled: LOG_HARDHAT_NETWORK,
  allowUnlimitedContractSize: true,
  tags: ['test'],
};

const localhost: NetworkUserConfig = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 1,
  chainId: 9001,
  ...(typeof MNEMONIC === 'string' && {
    accounts: { mnemonic: MNEMONIC },
  }),
  loggingEnabled: LOG_HARDHAT_NETWORK,
  tags: ['test'],
  saveDeployments: false,
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
  gas: 2100000,
  gasPrice: 8000000000,
  live: true,
  tags: ['mainnet', 'staging'],
};

const mumbai: NetworkUserConfig = {
  chainId: 80001,
  url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
  gasPrice: 35000000000,
  live: true,
  tags: ['polygon', 'staging'],
};

const polygon: NetworkUserConfig = {
  chainId: 137,
  url: `https://polygon-mainnet.infura.io/v3/${INFURA_PROD_KEY}`,
  gasPrice: 50000000000,
  live: true,
  tags: ['polygon', 'prod'],
};

const mainnet: NetworkUserConfig = {
  chainId: 1,
  url: `https://mainnet.infura.io/v3/${INFURA_PROD_KEY}`,
  gasPrice: 50000000000,
  live: true,
  tags: ['mainnet', 'prod'],
};

export const networks = {
  hardhat,
  ...(Boolean(MNEMONIC) && { localhost }),
  ...(Boolean(INFURA_STAGING_KEY) && { goerli, mumbai }),
  ...(Boolean(INFURA_STAGING_KEY) && { mainnet, polygon }),
} as const;
