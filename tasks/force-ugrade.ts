import type { Contract } from '@ethersproject/contracts';
import { task } from 'hardhat/config';

interface ForceUpgradeTaskParameters {
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
    const contract: Contract = await hre.upgrades.forceImport(
      taskArguments.proxyAddress,
      await hre.ethers.getContractFactory(
        taskArguments.contractName as ContractNames,
        (
          await hre.getSigners()
        )[0]
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
