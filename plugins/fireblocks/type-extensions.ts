import 'hardhat/types/config';
import 'hardhat/types/runtime';

import type { FireblocksSignerConfig } from './types';
import type { FireblocksSigner } from './fireblocks-signer';

declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    fireblocks?: FireblocksSignerConfig;
  }

  interface HardhatConfig {
    fireblocks: FireblocksSignerConfig;
  }
}

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    fireblocks: {
      getSigners: () => Promise<FireblocksSigner[]>;
      getSigner: (index: number) => Promise<FireblocksSigner | undefined>;
    };
  }
}
