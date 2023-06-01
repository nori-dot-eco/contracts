import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import type * as contractsConfig from '../contracts.json';

import { accounts } from './accounts';

export type ContractsInNetwork<
  T extends SupportedNetworks = SupportedNetworks
> = T extends SupportedNetworks ? keyof (typeof contractsConfig)[T] : never;

export type SupportedNetworks = keyof typeof networks;

const {
  ETHEREUM_RPC_URL,
  GOERLI_RPC_URL,
  MUMBAI_RPC_URL,
  POLYGON_RPC_URL,
  MNEMONIC,
  LOG_HARDHAT_NETWORK,
} = process.env;

const hardhat: NetworksUserConfig['hardhat'] = {
  blockGasLimit: 30_000_000,
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
  blockGasLimit: 30_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 3,
  chainId: 9001,
  ...(typeof MNEMONIC === 'string' && {
    accounts: { mnemonic: MNEMONIC },
  }),
  allowUnlimitedContractSize: true,
  loggingEnabled: LOG_HARDHAT_NETWORK,
  url: 'http://127.0.0.1:8545',
  tags: ['test'],
  saveDeployments: true,
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: GOERLI_RPC_URL,
  gas: 2_100_000,
  gasPrice: 8_000_000_000,
  live: true,
  tags: ['mainnet', 'staging'],
  ...(typeof MNEMONIC === 'string' && {
    accounts: { mnemonic: MNEMONIC },
  }),
};

const mumbai: NetworkUserConfig = {
  chainId: 80_001,
  url: MUMBAI_RPC_URL,
  gasPrice: 35_000_000_000,
  live: true,
  tags: ['polygon', 'staging'],
  ...(typeof MNEMONIC === 'string' && {
    accounts: { mnemonic: MNEMONIC },
  }),
};

const polygon: NetworkUserConfig = {
  chainId: 137,
  url: POLYGON_RPC_URL,
  gasPrice: 50_000_000_000,
  live: true,
  tags: ['polygon', 'prod'],
};

const mainnet: NetworkUserConfig = {
  chainId: 1,
  url: ETHEREUM_RPC_URL,
  gasPrice: 50_000_000_000,
  live: true,
  tags: ['mainnet', 'prod'],
};

export const networks = {
  hardhat,
  ...(Boolean(MNEMONIC) && { localhost }),
  ...(Boolean(GOERLI_RPC_URL) && { goerli }),
  ...(Boolean(MUMBAI_RPC_URL) && { mumbai }),
  ...(Boolean(ETHEREUM_RPC_URL) && { mainnet }),
  ...(Boolean(POLYGON_RPC_URL) && { polygon }),
} as const;
