import { accounts } from '@/config/accounts';

const { INFURA_STAGING_KEY, STAGING_MNEMONIC } = process.env;

export const networks = {
  hardhat: {
    gas: 2_000_000,
    blockGasLimit: 20_000_000,
    chainId: 9001,
    accounts,
  },
  ...(INFURA_STAGING_KEY &&
    STAGING_MNEMONIC && {
      goerli: {
        chainId: 5,
        url: `https://goerli.infura.io/v3/${INFURA_STAGING_KEY}`,
        accounts: { mnemonic: STAGING_MNEMONIC },
      },
      mumbai: {
        url: `https://polygon-mumbai.infura.io/v3/${INFURA_STAGING_KEY}`,
        accounts: { mnemonic: STAGING_MNEMONIC },
      },
    }),
} as const;
