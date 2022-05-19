import { task } from 'hardhat/config';

import {
  CONTRACT_FUNCTION_TASK_PARAMETERS,
  CONTRACT_FUNCTION_TASK_RUN,
} from './utils/contract-functions';

import * as contractsConfig from '@/contracts.json';

export const TASK = {
  name: 'NCCR_V0',
  description: 'Interact with the NCCR_V0 contract',
  run: async (
    {
      func,
      args: arguments_ = [],
      from = CONTRACT_FUNCTION_TASK_PARAMETERS.from.defaultValue,
    }: {
      func: ReturnType<
        typeof CONTRACT_FUNCTION_TASK_PARAMETERS.func.type.parse
      >; // todo typechain
      from?: ReturnType<
        typeof CONTRACT_FUNCTION_TASK_PARAMETERS.from.type.parse
      >;
      args?: unknown[];
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    if (hre.network.name === 'mainnet') {
      return CONTRACT_FUNCTION_TASK_RUN({
        contractAddress: contractsConfig.mainnet.NCCR_V0.proxyAddress,
        contractAbi: (
          await require('@/legacy-artifacts/NCCR_V0.sol/NCCR_V0.json')
        ).abi,
        from,
        func,
        args: arguments_,
        hre,
      });
    }
    throw new Error('You can only query NCCR_V0 on mainnet');
  },
  CONTRACT_FUNCTION_TASK_PARAMETERS,
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.func.type
  )
  .addOptionalParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.from.type
  )
  .addOptionalVariadicPositionalParam(
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.name,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.description,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.defaultValue,
    CONTRACT_FUNCTION_TASK_PARAMETERS.args.type
  );
