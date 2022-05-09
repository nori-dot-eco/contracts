import type { HardhatUserConfig } from 'hardhat/types';

const { FIREBLOCKS_API_KEY, FIREBLOCKS_SECRET_KEY_PATH, FIREBLOCKS_VAULT_ID } =
  process.env;
export const fireblocks: HardhatUserConfig['fireblocks'] =
  FIREBLOCKS_API_KEY && FIREBLOCKS_SECRET_KEY_PATH
    ? {
        apiKey: FIREBLOCKS_API_KEY,
        apiSecret: FIREBLOCKS_SECRET_KEY_PATH,
        vaultId: FIREBLOCKS_VAULT_ID,
      }
    : undefined;
