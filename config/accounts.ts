import type { HardhatNetworkAccountUserConfig } from 'hardhat/types';
import { ethers } from 'ethers';
import type { Address } from 'hardhat-deploy/types';

const STAGING_MNEMONIC = process.env.STAGING_MNEMONIC ?? undefined;

export const accounts: HardhatNetworkAccountUserConfig[] | undefined =
  STAGING_MNEMONIC
    ? [...Array(10)].map((_, i) => {
        return {
          privateKey: ethers.Wallet.fromMnemonic(
            STAGING_MNEMONIC,
            `m/44'/60'/0'/0/${i}`
          ).privateKey.toString(),
          balance: ethers.utils
            .parseEther([7, 9].includes(i) ? '0.0' : '1000000.0') // accounts 7 and 9 are given 0.0 ETH
            .toString(),
        };
      })
    : undefined;

export const namedAccounts = {
  admin: 0 as unknown as Address,
  supplier: 2 as unknown as Address,
  investor1: 4 as unknown as Address,
  investor2: 5 as unknown as Address,
  buyer: 6 as unknown as Address,
  employee: 7 as unknown as Address,
  mockPolygonBridge: 8 as unknown as Address,
  noriWallet: 9 as unknown as Address,
} as const;
