import { task } from 'hardhat/config';
import { formatEther } from 'ethers/lib/utils';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { accounts, namedAccounts } from '@/config/accounts';

export const TASK = {
  name: 'accounts',
  description: 'Prints the list of accounts',
  run: async (
    _taskArguments: void,
    _hre: HardhatRuntimeEnvironment
  ): Promise<void> => {
    const accountTable = Object.fromEntries(
      Object.entries(namedAccounts).map(([name, address], index) => {
        if (accounts === undefined) {
          throw new Error('accounts is undefined');
        }
        const account = accounts[index];
        return [
          name,
          {
            address,
            privateKey: account.privateKey,
            balance: formatEther(account.balance).toString(),
          },
        ];
      })
    );
    console.table(accountTable);
    return Promise.resolve();
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
