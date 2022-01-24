import { TASK as ERC_1820_TASK } from './erc-1820';
import { TASK as ETHERNAL_RESET_TASK } from './ethernal';
import { TASK as ACCOUNTS_TASK } from './accounts';
import { TASK as NORI_V0_TASK } from './nori-v0';
import { TASK as NCCR_V0_TASK } from './nccr-v0';
import { TASK as REMOVAL_TASK } from './removal';
import { TASK as CERTIFICATE_TASK } from './certificate';
import { TASK as FIFO_MARKET_TASK } from './fifo-market';
import { TASK as NORI_TASK } from './nori';

export const TASKS = {
  [ERC_1820_TASK.name]: { ...ERC_1820_TASK },
  [ETHERNAL_RESET_TASK.name]: { ...ETHERNAL_RESET_TASK },
  [ACCOUNTS_TASK.name]: { ...ACCOUNTS_TASK },
  [NORI_V0_TASK.name]: { ...NORI_V0_TASK },
  [NCCR_V0_TASK.name]: { ...NCCR_V0_TASK },
  [CERTIFICATE_TASK.name]: { ...CERTIFICATE_TASK },
  [FIFO_MARKET_TASK.name]: { ...FIFO_MARKET_TASK },
  [REMOVAL_TASK.name]: { ...REMOVAL_TASK },
  [NORI_TASK.name]: { ...NORI_TASK },
};
