import { task } from 'hardhat/config';

export const TASK = {
  name: 'accounts',
  description: 'Prints the list of accounts',
  run: async (
    _taskArgs: void,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const accounts = await hre.ethers.getSigners();
    accounts.forEach((account) => {
      console.log(account.address);
    });
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
