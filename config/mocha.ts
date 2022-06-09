import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS } = environment;
  return {
    parallel: !Boolean(REPORT_GAS),
  };
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
