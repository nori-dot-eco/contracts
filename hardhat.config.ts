import 'tsconfig-paths/register';
import '@/config/environment';
import '@/plugins';
import type { HardhatUserConfig } from 'hardhat/types';
import { extendEnvironment } from 'hardhat/config';

import { etherscan } from '@/config/etherscan';
import { tenderly } from '@/config/tenderly';
import { networks } from '@/config/networks';
import { namedAccounts } from '@/config/accounts';
import { defender } from '@/config/defender';
import { gasReporter } from '@/config/gas-reporter';

export const config: HardhatUserConfig = {
  tenderly,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  namedAccounts,
  networks,
  etherscan,
  defender,
  gasReporter,
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

// todo move to @/extensions/signers
extendEnvironment(async (hre) => {
  const accounts = (await hre.getNamedAccounts()) as NamedAccounts;
  const namedSigners: NamedSigners = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([accountName, address]) => {
        const signer = await hre.ethers.getSigner(address);
        return [accountName, signer];
      })
    )
  );
  (hre as unknown as CustomHardHatRuntimeEnvironment).namedSigners =
    namedSigners;
  (hre as unknown as CustomHardHatRuntimeEnvironment).namedAccounts = accounts;
});

export default config;
