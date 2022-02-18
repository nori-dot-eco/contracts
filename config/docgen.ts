import * as path from 'path';

import type { HardhatUserConfig } from 'hardhat/types';

export const docgen: HardhatUserConfig['docgen'] = {
  collapseNewlines: false,
  templates: [path.join(__dirname, '../docs/templates')],
  pages: (item, file) => {
    return [
      'FIFOMarket',
      'NORI',
      'Removal',
      'Certificate',
      'LockedNORI',
      'BridgedPolygonNORI',
      'ERC777PresetPausablePermissioned',
    ].includes((item as any)?.canonicalName)
      ? (item as any)?.canonicalName?.concat('.md')
      : undefined;
  },
};
