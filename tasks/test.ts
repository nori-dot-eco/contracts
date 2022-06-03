import type { ActionType } from 'hardhat/config';
import { task } from 'hardhat/config';
import type { RunSuperFunction } from 'hardhat/types';
import { TASK_TEST } from 'hardhat/builtin-tasks/task-names';

import { getConfig } from '@/hardhat.config'; // eslint-disable-line import/extensions -- valid import extension
import { validateTestEnvironment } from '@/tasks/utils/validate-environment';

export interface TestTaskOverrideParameters {
  reportGas?: boolean;
}

export const TASK = {
  name: TASK_TEST,
  description: 'Runs mocha tests',
  run: async (
    taskArguments: Parameters<
      ActionType<TestTaskOverrideParameters, unknown>
    >[0],
    hre: CustomHardHatRuntimeEnvironment,
    runSuper: RunSuperFunction<typeof taskArguments>
  ) => {
    validateTestEnvironment({ reportGas: taskArguments.reportGas });
    (hre as any).userConfig = getConfig(process.env);
    return runSuper(taskArguments);
  },
} as const;

task(TASK.name, TASK.description, TASK.run).addFlag(
  'reportGas',
  'Run tests and report gas usage'
);
