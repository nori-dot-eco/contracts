import path from 'path';

import type { HardhatUserConfig } from 'hardhat/types';

export const docgen: HardhatUserConfig['docgen'] = {
  collapseNewlines: false,
  templates: path.join(__dirname, '../docs/templates'),
  pages: (item, _file) => {
    return [
      'Market',
      'NORI',
      'Removal',
      'Certificate',
      'BridgedPolygonNORI',
      'ERC20Preset',
      'LockedNORILib',
      'RemovalQueue',
      'RemovalIdLib',
      'RestrictedNORI',
    ].includes((item as any)?.canonicalName)
      ? (item as any)?.canonicalName?.concat('.md')
      : undefined;
  },
};
