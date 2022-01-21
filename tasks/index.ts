import { TASK as ERC_1820_TASK } from './erc-1820';
import { TASK as ETHERNAL_RESET_TASK } from './ethernal';
import { TASK as ACCOUNTS_TASK } from './accounts';

export const TASKS = {
  [ERC_1820_TASK.name]: { ...ERC_1820_TASK },
  [ETHERNAL_RESET_TASK.name]: { ...ETHERNAL_RESET_TASK },
  [ACCOUNTS_TASK.name]: { ...ACCOUNTS_TASK },
};
