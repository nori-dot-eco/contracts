import type { HardhatUserConfig } from 'hardhat/types';
import fs from 'fs';

function getRemappings() {
  return fs
    .readFileSync('remappings.txt', 'utf8')
    .split('\n')
    .filter(Boolean) // remove empty lines
    .filter((line) => !line.includes('node_modules')) // only apply non-hardhat-native remapping
    .map((line) => line.trim().split('='));
}

export const preprocess: HardhatUserConfig['preprocess'] = {
  eachLine: (hre) => ({
    transform: (line: string) => {
      if (line.match(/^\s*import /i)) {
        getRemappings().forEach(([find, replace]) => {
          if (line.match(find)) {
            line = line.replace(find, replace);
          }
        });
      }
      return line;
    },
  }),
};