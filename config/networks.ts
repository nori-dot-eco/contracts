import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, STAGING_MNEMONIC, PROD_MNEMONIC } = process.env;

const hardhat: NetworksUserConfig['hardhat'] = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 1,
  chainId: 9001,
  accounts,
};

const localhost: NetworkUserConfig = {
  blockGasLimit: 20_000_000,
  initialBaseFeePerGas: 1,
  gasPrice: 1,
  chainId: 9001,
  accounts: { mnemonic: STAGING_MNEMONIC },
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: STAGING_MNEMONIC },
  gas: 2100000,
  gasPrice: 8000000000,
};

const mumbai: NetworkUserConfig = {
  url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: STAGING_MNEMONIC },
  gasPrice: 35000000000,
};

const polygon: NetworkUserConfig = {
  url: `https://polygon.infura.io/v3/${INFURA_STAGING_KEY}`, // todo use prod key
  accounts: { mnemonic: PROD_MNEMONIC },
};

const mainnet: NetworkUserConfig = {
  url: `https://mainnet.infura.io/v3/${INFURA_STAGING_KEY}`, // todo use prod key
  accounts: { mnemonic: PROD_MNEMONIC },
};

export const networks = {
  hardhat,
  localhost,
  ...(STAGING_MNEMONIC && { goerli, mumbai }),
  ...(INFURA_STAGING_KEY && STAGING_MNEMONIC && { goerli, mumbai }),
  ...(INFURA_STAGING_KEY && PROD_MNEMONIC && { mainnet, polygon }),
} as const;
