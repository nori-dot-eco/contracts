import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS, CI } = environment;
  return {
    parallel: !Boolean(REPORT_GAS) && !Boolean(CI),
  };
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
