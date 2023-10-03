import 'hardhat/types/config';
import 'hardhat/types/runtime';

import type { FireblocksProviderConfig } from '@fireblocks/fireblocks-web3-provider';

import type { FireblocksSigner } from './fireblocks-signer';

declare module 'hardhat/types/config' {
  interface HttpNetworkUserConfig {
    fireblocks?: FireblocksProviderConfig;
  }
  interface HttpNetworkConfig {
    fireblocks?: FireblocksProviderConfig;
  }
  interface HardhatConfig {
    fireblocks: FireblocksProviderConfig;
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
