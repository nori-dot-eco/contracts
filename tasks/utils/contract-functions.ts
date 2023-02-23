import '@nomiclabs/hardhat-ethers';
import '@/plugins/fireblocks';
import { types } from 'hardhat/config';
import { Contract } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

export const CONTRACT_FUNCTION_TASK_PARAMETERS = {
  func: {
    name: 'func',
    description: 'the function to call',
    defaultValue: undefined,
    type: types.string,
  },
  from: {
    name: 'from',
    description: 'the index of the signer account to use',
    defaultValue: 0,
    type: types.int,
  },
  args: {
    name: 'args',
    description: 'the args to pass the function',
    defaultValue: undefined,
    type: undefined,
  },
} as const;

export const CONTRACT_FUNCTION_TASK_RUN = async ({
  contractAddress,
  contractAbi,
  from,
  func,
  args,
  hre,
}: {
  contractAddress: ConstructorParameters<typeof Contract>[0];
  contractAbi: ConstructorParameters<typeof Contract>[1];
  from: number;
  func: string;
  args: unknown[];
  hre: HardhatRuntimeEnvironment;
}): Promise<void> => {
  if (hre.network.provider) {
    const signers = await hre.getSigners();
    const signer = signers[from];
    const contract = new Contract(
      contractAddress,
      contractAbi, // todo store artifacts in contracts.json
      signer
    );
    const transaction = await contract[func](...args);
    const result = await transaction.wait?.();
    if (result?.transactionHash) {
      console.log({ result });
    } else {
      console.log({
        raw: transaction,
        parsed: hre.ethers.BigNumber.isBigNumber(transaction)
          ? transaction.toString()
          : transaction,
      });
    }
  } else {
    throw new Error('No provider available');
  }
};
