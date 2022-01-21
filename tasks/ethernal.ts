import { execSync } from 'child_process';

import { task } from 'hardhat/config';

export const TASK = {
  name: 'ethernal:reset',
  description: 'Resets ethernal config to block 0',
  run: async () => {
    try {
      execSync('rm .openzeppelin/unknown-9001.json', { cwd: __dirname });
    } catch (e) {
      //
    }
    execSync('ethernal reset nori');
    console.log('RESET ETHERNAL');
    return Promise.resolve();
  },
} as const;

task(TASK.name, TASK.description, TASK.run);
