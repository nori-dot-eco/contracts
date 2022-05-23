import type { HardhatUserConfig } from 'hardhat/types';

const { CI, REPORT_GAS } = process.env;

export const mocha: HardhatUserConfig['mocha'] = {
  parallel: !Boolean(CI) || !REPORT_GAS,
};
