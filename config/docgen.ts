import * as path from 'path';

import type { HardhatUserConfig } from 'hardhat/types';

export const docgen: HardhatUserConfig['docgen'] = {
  collapseNewlines: false,
  templates: [path.join(__dirname, '../docs/templates')],
  pages: (item, file): string => {
    return file?.absolutePath?.replace('.sol', '.md');
  },
};
