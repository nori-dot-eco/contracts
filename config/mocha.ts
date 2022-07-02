import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS, CI } = environment;
  const mochaConfig: HardhatUserConfig['mocha'] =
    REPORT_GAS || CI
      ? {}
      : {
          parallel: !REPORT_GAS && !CI,
        };

  return mochaConfig;
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
