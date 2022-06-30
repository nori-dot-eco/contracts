import { task } from 'hardhat/config';

interface SignMessageTaskParameters {
  message: string;
}

export const TASK = {
  name: 'sign-message',
  description: 'Sign an arbitrary message',
  run: async (
    taskArguments: SignMessageTaskParameters,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const [signer] = await hre.getSigners();
    const signature = await signer.signMessage(taskArguments.message);
    console.log(`Message signature:`, signature);
    if (ethers.utils.verifyMessage(taskArguments.message, signature)) {
      console.log(`Verified`);
    } else {
      console.log(`Verification failed`);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run).addPositionalParam('message');
