import type { ActionType } from 'hardhat/config';
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
import { TASK as UPGRADE_TASK } from './upgrade';
import { TASK as ACCOUNTS_TASK } from './accounts';
import { TASK as NCCR_V0_TASK } from './nccr-v0';
import { TASK as REMOVAL_TASK } from './removal';
import { TASK as CERTIFICATE_TASK } from './certificate';
import { TASK as MARKET_TASK } from './market';
import { TASK as NORI_TASK } from './nori';
import { TASK as LOCKED_NORI_TASK } from './locked-nori'; // todo make work with forked repo
import { TASK as BRIDGED_POLYGON_NORI_TASK } from './bridged-polygon-nori';
import { DEFENDER_ADD_TASK } from './defender';
import { GET_VESTING_TASK as VESTING_TASK } from './vesting'; // todo make work with forked repo
import { GET_MIGRATE_REMOVALS_TASK } from './migrate-removals';
import { GET_MIGRATE_CERTIFICATES_TASK } from './migrate-certificates';
import { GET_LIST_MIGRATED_REMOVALS_TASK } from './list-remaining-migrated-removals';
import { TASK as FORCE_UPGRADE_TASK } from './force-ugrade';
import { TASK as SIGN_MESSAGE_TASK } from './sign-message';

export interface Task {
  run: ActionType<
    {
      run: ActionType<{}, any>;
    },
    any
  >;
}

// const VESTING_TASK = GET_VESTING_TASK();  // todo make work with forked repo

export const TASKS = {
  [TASK_VERIFY_VERIFY]: {} as {
    run: ActionType<
      {
        address: string;
        // constructor args given as positional params
        constructorArgsParams: string[];
        // Filename of constructor arguments module
        constructorArgs?: string;
        // Fully qualified name of the contract
        contract?: string;
        // Filename of libraries module
        libraries?: string;
      },
      any
    >;
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
  [MARKET_TASK.name]: { ...MARKET_TASK },
  [REMOVAL_TASK.name]: { ...REMOVAL_TASK },
  [NORI_TASK.name]: { ...NORI_TASK },
  [LOCKED_NORI_TASK.name]: { ...LOCKED_NORI_TASK }, // todo make work with forked repo
  [BRIDGED_POLYGON_NORI_TASK.name]: { ...BRIDGED_POLYGON_NORI_TASK },
  [DEFENDER_ADD_TASK.name]: { ...DEFENDER_ADD_TASK },
  [UPGRADE_TASK.name]: { ...UPGRADE_TASK },
  [VESTING_TASK().name]: { ...VESTING_TASK() }, // todo make work with forked repo
  [GET_MIGRATE_REMOVALS_TASK().name]: { ...GET_MIGRATE_REMOVALS_TASK() },
  [GET_MIGRATE_CERTIFICATES_TASK().name]: {
    ...GET_MIGRATE_CERTIFICATES_TASK(),
  },
  [GET_LIST_MIGRATED_REMOVALS_TASK().name]: {
    ...GET_LIST_MIGRATED_REMOVALS_TASK(),
  },
  [FORCE_UPGRADE_TASK.name]: { ...FORCE_UPGRADE_TASK },
  [SIGN_MESSAGE_TASK.name]: { ...SIGN_MESSAGE_TASK },
} as const;
