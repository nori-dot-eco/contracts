import 'tsconfig-paths/register';
import '@/plugins';
import type {
  HardhatNetworkAccountUserConfig,
  HardhatUserConfig,
} from 'hardhat/types';
import { ethers } from 'ethers';

import { env } from '@/utils/environment';

export const namedAccounts = {
  admin: 0,
  supplier: 2,
  buyer: 6,
  noriWallet: 9,
};

const defaultAccountFixtures: HardhatNetworkAccountUserConfig[] | undefined =
  env.MNEMONIC
    ? [...Array(10)].map((_, i) => {
        return {
          privateKey: ethers.Wallet.fromMnemonic(
            env.MNEMONIC as string,
            `m/44'/60'/0'/0/${i}`
          ).privateKey.toString(),
          balance: ethers.utils
            .parseEther([7, 9].includes(i) ? '0.0' : '1000000.0') // accounts 7 and 9 are given 0.0 ETH
            .toString(),
        };
      })
    : undefined;

const config: HardhatUserConfig = {
  tenderly:
    env.TENDERLY_USERNAME && env.TENDERLY_PROJECT
      ? {
          username: env.TENDERLY_USERNAME,
          project: env.TENDERLY_PROJECT,
        }
      : undefined,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  namedAccounts,
  networks: {
    hardhat: {
      gas: 2_000_000,
      blockGasLimit: 20_000_000,
      chainId: 9001,
      accounts: defaultAccountFixtures,
    },
    ...(env.INFURA_STAGING_KEY &&
      env.STAGING_MNEMONIC && {
        goerli: {
          chainId: 5,
          url: `https://goerli.infura.io/v3/${env.INFURA_STAGING_KEY}`,
          accounts: { mnemonic: env.STAGING_MNEMONIC },
        },
        mumbai: {
          url: `https://polygon-mumbai.infura.io/v3/${env.INFURA_STAGING_KEY}`,
          accounts: { mnemonic: env.STAGING_MNEMONIC },
        },
      }),
  },
  solidity: {
    compilers: [
      {
        version: '0.5.11', // todo deprecate when we remove the *_V0 contracts
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};

export default config;
