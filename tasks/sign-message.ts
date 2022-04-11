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
    const hashedMessage = ethers.utils.hashMessage(taskArgs.message);
    const signer = (await hre.getSigners())[0];
    const signedMessage = await signer.signMessage(hashedMessage);
    console.log(`Signed message:`, signedMessage);
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addPositionalParam('message')
