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
