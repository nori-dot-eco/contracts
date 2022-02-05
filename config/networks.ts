import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, STAGING_MNEMONIC } = process.env;

const hardhat: NetworksUserConfig['hardhat'] = {
  gas: 2_000_000,
  blockGasLimit: 20_000_000,
  chainId: 9001,
  accounts,
};

const goerli: NetworkUserConfig = {
  chainId: 5,
  url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: STAGING_MNEMONIC },
};

const mumbai: NetworkUserConfig = {
  url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
  accounts: { mnemonic: STAGING_MNEMONIC },
};

export const networks = {
  hardhat,
  ...(INFURA_STAGING_KEY && STAGING_MNEMONIC && { goerli, mumbai }),
} as const;
