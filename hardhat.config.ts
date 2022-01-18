import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-deploy';
import '@primitivefi/hardhat-marmite';
import 'hardhat-ethernal';

import '@/tasks';
import { execSync } from 'child_process';

import { extendEnvironment, task } from 'hardhat/config';
import type { HardhatUserConfig } from 'hardhat/types/config';
import { ethers } from 'ethers';
import type { HardhatNetworkAccountUserConfig } from 'hardhat/types';

extendEnvironment((hre) => {
  hre.ethernalSync = false;
  hre.ethernalWorkspace = 'Workspace';
  hre.ethernalTrace = false;
});

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
    imports: 'artifacts',
  },
  namedAccounts,
  networks: {
    hardhat: {
      // live: false,
      gas: 2_000_000,
      blockGasLimit: 21_000_000,
      chainId: 9001,
      accounts: defaultAccountFixtures,
    },
    goerli: {
      chainId: 5,
      url: `https://goerli.infura.io/v3/${process.env.INFURA_STAGING_KEY}`,
      accounts: defaultAccountFixtures,
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_STAGING_KEY}`,
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
        version: '0.8.9',
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
