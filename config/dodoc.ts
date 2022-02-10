import type { HardhatUserConfig } from 'hardhat/config';

const runOnCompile =
  Boolean(process.env.DODOC_RUN_ON_COMPILE) &&
  process.env.DODOC_RUN_ON_COMPILE !== 'false';

export const dodoc: HardhatUserConfig['dodoc'] = {
  runOnCompile,
  templatePath:
    '/home/ubuntu/dev/nori/@nori-dot-com/contracts/config/template.sqrl',
};
