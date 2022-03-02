import type { ActionType } from 'hardhat/types';
import {
  TASK_VERIFY,
  TASK_VERIFY_GET_MINIMUM_BUILD,
  TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS,
  TASK_VERIFY_GET_COMPILER_VERSIONS,
  TASK_VERIFY_GET_ETHERSCAN_ENDPOINT,
  TASK_VERIFY_GET_CONTRACT_INFORMATION,
  TASK_VERIFY_VERIFY_MINIMUM_BUILD,
  TASK_VERIFY_VERIFY,
  TASK_VERIFY_GET_LIBRARIES,
} from '@nomiclabs/hardhat-etherscan/dist/src/constants';

import { TASK as ERC_1820_TASK } from './erc-1820';
import { TASK as ACCOUNTS_TASK } from './accounts';
import { TASK as NCCR_V0_TASK } from './nccr-v0';
import { TASK as REMOVAL_TASK } from './removal';
import { TASK as CERTIFICATE_TASK } from './certificate';
import { TASK as FIFO_MARKET_TASK } from './fifo-market';
import { TASK as NORI_TASK } from './nori';
import { TASK as LOCKED_NORI_TASK } from './locked-nori';
import { TASK as BRIDGED_POLYGON_NORI_TASK } from './bridged-polygon-nori';
import { TASK as DEFENDER_TASK } from './defender';
import { TASK as VESTING_TASK } from './vesting';

interface Task {
  run: ActionType<unknown>;
}

export const TASKS = {
  [TASK_VERIFY_VERIFY]: {} as {
    run: ActionType<{
      address: string;
      // constructor args given as positional params
      constructorArgsParams: string[];
      // Filename of constructor arguments module
      constructorArgs?: string;
      // Fully qualified name of the contract
      contract?: string;
      // Filename of libraries module
      libraries?: string;
    }>;
  },
  [TASK_VERIFY]: {} as Task,
  [TASK_VERIFY_GET_MINIMUM_BUILD]: {} as Task,
  [TASK_VERIFY_GET_CONSTRUCTOR_ARGUMENTS]: {} as Task,
  [TASK_VERIFY_GET_COMPILER_VERSIONS]: {} as Task,
  [TASK_VERIFY_GET_ETHERSCAN_ENDPOINT]: {} as Task,
  [TASK_VERIFY_GET_CONTRACT_INFORMATION]: {} as Task,
  [TASK_VERIFY_VERIFY_MINIMUM_BUILD]: {} as Task,
  [TASK_VERIFY_GET_LIBRARIES]: {} as Task,
  [ERC_1820_TASK.name]: { ...ERC_1820_TASK },
  [ACCOUNTS_TASK.name]: { ...ACCOUNTS_TASK },
  [NCCR_V0_TASK.name]: { ...NCCR_V0_TASK },
  [CERTIFICATE_TASK.name]: { ...CERTIFICATE_TASK },
  [FIFO_MARKET_TASK.name]: { ...FIFO_MARKET_TASK },
  [REMOVAL_TASK.name]: { ...REMOVAL_TASK },
  [NORI_TASK.name]: { ...NORI_TASK },
  [LOCKED_NORI_TASK.name]: { ...LOCKED_NORI_TASK },
  [BRIDGED_POLYGON_NORI_TASK.name]: { ...BRIDGED_POLYGON_NORI_TASK },
  [DEFENDER_TASK.name]: { ...DEFENDER_TASK },
  [VESTING_TASK.name]: { ...VESTING_TASK },
} as const;
