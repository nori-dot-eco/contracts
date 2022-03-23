import type { ActionType } from 'hardhat/config';
import { task } from 'hardhat/config';
import type { RunSuperFunction } from 'hardhat/types';

import { validateTestEnvironment } from '@/tasks/utils/validate-environment';

export const TASK = {
  name: 'coverage',
  description: 'Generates a code coverage report for tests',
  run: async (
    taskArgs: Parameters<ActionType<unknown, unknown>>,
    hre: CustomHardHatRuntimeEnvironment,
    runSuper: RunSuperFunction<typeof taskArgs>
  ) => {
    validateTestEnvironment();
    return runSuper(taskArgs);
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
