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
import { solidity } from '@/config/solidity';
import { dodoc } from '@/config/dodoc';

export const config: HardhatUserConfig = {
  tenderly,
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'artifacts',
  },
  dodoc,
  // docgen: {
  //   collapseNewlines: false,
  // },
  namedAccounts,
  networks,
  etherscan,
  defender,
  gasReporter,
  solidity,
};

// todo move to @/extensions/signers
extendEnvironment(async (hre) => {
  const accounts = (await hre.getNamedAccounts()) as NamedAccounts;
  const namedSigners: NamedSigners = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([accountName, address]) => {
        return [accountName, await hre.waffle.provider.getSigner(address)];
      })
    )
  );
  (hre as unknown as CustomHardHatRuntimeEnvironment).namedSigners =
    namedSigners;
  (hre as unknown as CustomHardHatRuntimeEnvironment).namedAccounts = accounts;
});

export default config;
