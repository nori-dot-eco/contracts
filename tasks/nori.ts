// todo make work with NORI.sol instead of NORI_V0.sol
import { Contract } from 'ethers';
import { task, types } from 'hardhat/config';

import * as contractsConfig from '@/contracts.json';
import { abi as noriV0Abi } from '@/artifacts/Nori_V0.sol/Nori_V0.json';

const PARAMETERS = {
  func: {
    name: 'func',
    description: 'the function to call',
    defaultValue: undefined,
    type: types.string,
  },
  from: {
    name: 'from',
    description: 'the index of the signer account to user',
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

export const TASK = {
  name: 'nori',
  description: 'Interact with the nori contract',
  run: async (
    {
      func,
      args = [],
      from = PARAMETERS.from.defaultValue,
    }: {
      func: ReturnType<typeof PARAMETERS.func.type.parse>; // todo typechain
      from?: ReturnType<typeof PARAMETERS.from.type.parse>;
      args?: unknown[];
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    if (hre.network.provider) {
      const signers = await hre.ethers.getSigners();
      const signer = signers[from];
      const noriV0TokenContract = new Contract(
        contractsConfig[hre.network.name].Nori_V0.proxyAddress,
        noriV0Abi, // todo store artifacts in contracts.json
        signer
      );
      const transaction = await noriV0TokenContract[func](...args);
      const result = await transaction.wait();
      console.log({ result });
    } else {
      throw new Error('No provider available');
    }
  },
  parameters: PARAMETERS,
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addParam(
    PARAMETERS.func.name,
    PARAMETERS.func.description,
    PARAMETERS.func.defaultValue,
    PARAMETERS.func.type
  )
  .addOptionalParam(
    PARAMETERS.from.name,
    PARAMETERS.from.description,
    PARAMETERS.from.defaultValue,
    PARAMETERS.from.type
  )
  .addVariadicPositionalParam(
    PARAMETERS.args.name,
    PARAMETERS.args.description,
    PARAMETERS.args.defaultValue,
    PARAMETERS.args.type
  );
