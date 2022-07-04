import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS, CI, TRACE } = environment;
  const mochaConfig: HardhatUserConfig['mocha'] =
    REPORT_GAS || CI || TRACE
      ? {}
      : {
          parallel: true,
        };
  return mochaConfig;
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
