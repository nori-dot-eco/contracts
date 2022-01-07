import { execSync } from 'child_process';

import { task } from 'hardhat/config';
import './erc-1820';
import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-deploy';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-ethernal';
import type { HardhatUserConfig } from 'hardhat/config';
import { ethers } from 'ethers';
import type { HardhatNetworkAccountUserConfig } from 'hardhat/types';

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => {
    console.log(account.address);
  });
});

task(
  'ethernal:reset',
  'Prints the list of accounts',
  async (_taskArgs, _hre) => {
    try {
      execSync('rm .openzeppelin/unknown-9001.json', { cwd: __dirname });
    } catch (e) {
      //
    }
    execSync('ethernal reset nori');
    console.log('RESET ETHERNAL');
    return Promise.resolve();
  }
);

export const namedAccounts = {
  admin: 0,
  buyer: 1,
  supplier: 2,
  noriWallet: 9,
};

const defaultAccountFixtures: HardhatNetworkAccountUserConfig[] | undefined =
  process.env.MNEMONIC
    ? [...Array(10)].map((_, i) => {
        return {
          privateKey: ethers.Wallet.fromMnemonic(
            process.env.MNEMONIC as string,
            `m/44'/60'/0'/0/${i}`
          ).privateKey.toString(),
          balance: ethers.utils
            .parseEther([7, 9].includes(i) ? '0.0' : '1000000.0') // accounts 7 and 9 are given 0.0 ETH
            .toString(),
        };
      })
    : undefined;

const config: HardhatUserConfig = {
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports',
  },
  namedAccounts,
  networks: {
    hardhat: {
      live: false,
      gas: 2_000_000,
      blockGasLimit: 21_000_000,
      chainId: 9001,
      accounts: defaultAccountFixtures,
    },
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
