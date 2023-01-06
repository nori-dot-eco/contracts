import type { HardhatUserConfig } from 'hardhat/types';

export const getMochaConfig = (
  environment = process.env
): HardhatUserConfig['mocha'] => {
  const { REPORT_GAS, CI, TRACE } = environment;
  const mochaConfig: HardhatUserConfig['mocha'] =
    REPORT_GAS || CI || TRACE
      ? {}
      : {
          parallel: false, // todo set this to true when this issue is resolved https://github.com/NomicFoundation/hardhat/pull/3382
        };
  return mochaConfig;
};

export const mocha: HardhatUserConfig['mocha'] = getMochaConfig();
