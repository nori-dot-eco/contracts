import type { ActionType } from 'hardhat/config';
import { extendConfig, task } from 'hardhat/config';
import type { RunSuperFunction } from 'hardhat/types';
import { TASK_TEST } from 'hardhat/builtin-tasks/task-names';

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
    return runSuper(taskArguments);
  },
} as const;

task(TASK.name, TASK.description, TASK.run).addFlag(
  'reportGas',
  'Run tests and report gas usage'
);

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
