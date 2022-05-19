import * as path from 'node:path';

import type { HardhatUserConfig } from 'hardhat/types';

export const docgen: HardhatUserConfig['docgen'] = {
  collapseNewlines: false,
  templates: path.join(__dirname, '../docs/templates'),
  pages: (item, _file) => {
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
