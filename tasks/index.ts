import { TASK as ERC_1820_TASK } from './erc-1820';

export const TASKS = {
  [ERC_1820_TASK.name]: { ...ERC_1820_TASK },
  'ethernal:reset': {} as {
    name: 'ethernal:reset';
    description: string;
    run: () => Promise<unknown>;
  },
};

export * from './erc-1820';
