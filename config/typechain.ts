import type { HardhatUserConfig } from 'hardhat/types';

export const typechain: HardhatUserConfig['typechain'] = {
  externalArtifacts: [
    'legacy-artifacts/contracts/LockedNORI.sol/LockedNORI.json',
  ],
  outDir: 'types/typechain-types',
};
