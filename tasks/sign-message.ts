import { task } from 'hardhat/config';

interface SignMessageTaskParameters {
  message: string;
}

export const TASK = {
  name: 'sign-message',
  description: 'Sign an arbitrary message',
  run: async (
    taskArgs: SignMessageTaskParameters,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const signer = (await hre.getSigners())[0];
    const signature = await signer.signMessage(taskArgs.message);
    console.log(`Message signature:`, signature);
    if (ethers.utils.verifyMessage(taskArgs.message, signature)) {
        console.log(`Verified`);
    } else {
        console.log(`Verification failed`);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addPositionalParam('message')
