import type { HardhatUserConfig } from 'hardhat/types';

const { CI } = process.env;

export const mocha: HardhatUserConfig['mocha'] = {
  parallel: !Boolean(CI),
};
