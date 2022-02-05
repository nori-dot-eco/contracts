import type { NetworksUserConfig, NetworkUserConfig } from 'hardhat/types';

import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, STAGING_MNEMONIC } = process.env;

const hardhat: NetworksUserConfig['hardhat'] = accounts
  ? {
      gas: 2_000_000,
      blockGasLimit: 20_000_000,
      chainId: 9001,
      accounts,
    }
  : undefined;

const goerli: NetworkUserConfig | undefined =
  INFURA_STAGING_KEY && STAGING_MNEMONIC
    ? {
        chainId: 5,
        url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
        accounts: { mnemonic: STAGING_MNEMONIC },
      }
    : undefined;

const mumbai: NetworkUserConfig | undefined =
  INFURA_STAGING_KEY && STAGING_MNEMONIC
    ? {
        url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
        accounts: { mnemonic: STAGING_MNEMONIC },
      }
    : undefined;

export const networks = {
  hardhat,
  goerli,
  mumbai,
} as const;
