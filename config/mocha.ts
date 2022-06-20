import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS, CI } = environment;
  const mochaConfig: HardhatUserConfig['mocha'] = {
    parallel: !Boolean(REPORT_GAS) && !Boolean(CI),
  };
  return mochaConfig;
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
