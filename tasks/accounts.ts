import { task } from 'hardhat/config';

export const TASK = {
  name: 'accounts',
  description: 'Prints the list of accounts',
  run: async (
    _taskArguments: void,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
      console.log(account.address);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
