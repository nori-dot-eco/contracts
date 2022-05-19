import type { HardhatUserConfig } from 'hardhat/types';

const { CI } = process.env;
console.log({ CI, tci: typeof CI });
export const mocha: HardhatUserConfig['mocha'] = {
  parallel: !Boolean(CI),
};
