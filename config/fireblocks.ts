import "@fireblocks/hardhat-fireblocks";

const { FIREBLOCKS_API_KEY, FIREBLOCKS_SECRET_KEY_PATH, FIREBLOCKS_VAULT_ID } =
  process.env;
export const fireblocks =
  FIREBLOCKS_API_KEY && FIREBLOCKS_SECRET_KEY_PATH
    ? {
        apiKey: FIREBLOCKS_API_KEY,
        privateKey: FIREBLOCKS_SECRET_KEY_PATH,
        vaultAccountIds: FIREBLOCKS_VAULT_ID,
      }
    : undefined;
