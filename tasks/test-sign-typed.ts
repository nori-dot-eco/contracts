import { task } from 'hardhat/config';

export interface TestSignTypesTaskParameters {}

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
      name: 'NORI',
      version: '1',
      chainId: hre.network.config.chainId,
      verifyingContract: '0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8',
    };
    const owner = '0x0F032F48fD4b38eA605F438922CA19FA79d0e6A7';
    const spender = '0xcdcb43cb7b668f0c1ca04fe4b60da7f8c62be393';
    const value = {
      owner,
      spender,
      value: ethers.BigNumber.from('46425588600000000000000'), // ethers.utils.parseEther('100'),
      nonce: ethers.BigNumber.from('0'),
      deadline: 1_664_492_773,
    };
    const signature = await signer._signTypedData(domain, types, value);
    const verified = ethers.utils.verifyTypedData(
      domain,
      types,
      value,
      signature
    );
    if (verified == (await signer.getAddress())) {
      console.log(`Verified`);
    } else {
      console.log(`Verification failed`);
    }
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
