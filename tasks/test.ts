import type { ActionType } from 'hardhat/config';
import { task } from 'hardhat/config';
import type { RunSuperFunction } from 'hardhat/types';
import { TASK_TEST } from 'hardhat/builtin-tasks/task-names';

import { getGasReporterConfig } from '@/config/gas-reporter';
import { validateTestEnvironment } from '@/tasks/utils/validate-environment';

interface TestTaskOverrideParameters {
  reportGas?: boolean;
}

export const TASK = {
  name: TASK_TEST,
  description: 'Runs mocha tests',
  run: async (
    taskArgs: Parameters<ActionType<TestTaskOverrideParameters, unknown>>[0],
    hre: CustomHardHatRuntimeEnvironment,
    runSuper: RunSuperFunction<typeof taskArgs>
  ) => {
    const { REPORT_GAS } = process.env;
    validateTestEnvironment();
    if (Boolean(taskArgs?.reportGas) || REPORT_GAS) {
      hre.log(
        'Setting process.env.REPORT_GAS to true',
        `Previous value: ${REPORT_GAS}`
      );
      process.env.REPORT_GAS = true;
      hre.config.gasReporter = getGasReporterConfig(process.env);
    }
    return runSuper(taskArgs);
  },
} as const;

task(TASK.name, TASK.description, TASK.run).addFlag(
  'reportGas',
  'Run tests and report gas usage'
);
