import type { HardhatUserConfig } from 'hardhat/config';

const runOnCompile =
  Boolean(process.env.DODOC_RUN_ON_COMPILE) &&
  process.env.DODOC_RUN_ON_COMPILE !== 'false';

export const dodoc: HardhatUserConfig['dodoc'] = {
  runOnCompile,
};
