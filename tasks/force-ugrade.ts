import { task } from 'hardhat/config';

export interface ForceUpgradeTaskParameters {
  proxyAddress: string;
  contractName: string;
}

export const TASK = {
  name: 'force-upgrade',
  description: 'Force upgrades a contract when network file is lost',
  run: async (
    taskArguments: ForceUpgradeTaskParameters,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const signers = await hre.getSigners();
    await hre.upgrades.forceImport(
      taskArguments.proxyAddress,
      await hre.ethers.getContractFactory(
        taskArguments.contractName,
        signers[0]
      ),
      {
        kind: 'transparent',
      }
    );
    console.log(`Force upgraded`, taskArguments.proxyAddress);
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addPositionalParam('proxyAddress')
  .addPositionalParam('contractName');
