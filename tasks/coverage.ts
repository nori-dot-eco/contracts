import type { ActionType } from 'hardhat/config';
import { task } from 'hardhat/config';
import type { RunSuperFunction } from 'hardhat/types';

import type { TestTaskOverrideParameters } from '@/tasks/test';

export const TASK = {
  name: 'coverage',
  description: 'Generates a code coverage report for tests',
  run: async (
    taskArguments: Parameters<
      ActionType<TestTaskOverrideParameters, unknown>
    >[0],
    hre: CustomHardHatRuntimeEnvironment,
    runSuper: RunSuperFunction<typeof taskArguments>
  ) => {
    return runSuper(taskArguments);
  },
} as const;

task(TASK.name, TASK.description, TASK.run);

extendConfig(() => {
  // todo these would be set more appropriately in environment.ts
  process.env.MINT = false;
  process.env.FORCE_PROXY_DEPLOYMENT = true;
  process.env.ETHERNAL = false;
  process.env.TENDERLY = false;
  process.env.NODE_ENV = 'test';
  process.env.FIREBLOCKS_API_KEY = undefined;
  process.env.FIREBLOCKS_API_SECRET_PATH = undefined;
  process.env.FIREBLOCKS_VAULT_ID = undefined;
});
