import { task } from 'hardhat/config';

interface TestSignTypesTaskParameters {}

export const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export const TASK = {
  name: 'test-sign-typed',
  description: 'Test signing typed data',
  run: async (
    taskArguments: TestSignTypesTaskParameters,
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const [signer] = await hre.getSigners();
    const domain = {
      name: 'FooToken',
      version: '1',
      chainId: hre.network.config.chainId,
    };
    const addr = "0x465d5a3fFeA4CD109043499Fa576c3E16f918463";
    const value = {
      owner: addr,
      spender: addr,
      value: ethers.utils.parseEther('100'),
      nonce: 1,
      deadline: 2000000000,
    };
    console.log(value);
    const signature = await signer._signTypedData(domain, types, value);
    console.log(`Signature:`, signature);
    if (ethers.utils.verifyTypedData(domain, types, value, signature)) {
      console.log(`Verified`);
    } else {
      console.log(`Verification failed`);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
