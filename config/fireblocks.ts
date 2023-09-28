import "@fireblocks/hardhat-fireblocks";
import {FireblocksProviderConfig } from "@fireblocks/fireblocks-web3-provider";

const { FIREBLOCKS_API_KEY, FIREBLOCKS_SECRET_KEY_PATH, FIREBLOCKS_VAULT_ID } =
  process.env;
export const fireblocks: FireblocksProviderConfig | undefined =
  FIREBLOCKS_API_KEY && FIREBLOCKS_SECRET_KEY_PATH
    ? {
        apiKey: FIREBLOCKS_API_KEY,
        privateKey: FIREBLOCKS_SECRET_KEY_PATH,
        vaultAccountIds: FIREBLOCKS_VAULT_ID,
      }
    : undefined;
