import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

export interface SignMessageTaskParameters {
  message: string;
}

export const TASK = {
  name: 'sign-message',
  description: 'Sign an arbitrary message',
  run: async (
    taskArguments: SignMessageTaskParameters,
    hre: HardhatRuntimeEnvironment
  ): Promise<void> => {
    const [signer] = await hre.getSigners();
    const signature = await signer.signMessage(taskArguments.message);
    console.log(`Message signature:`, signature);
    if (hre.ethers.utils.verifyMessage(taskArguments.message, signature)) {
      console.log(`Verified`);
    } else {
      console.log(`Verification failed`);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run).addPositionalParam('message');
