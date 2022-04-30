import type { HardhatNetworkAccountUserConfig } from 'hardhat/types';
import { ethers } from 'ethers';

const MNEMONIC = process.env.MNEMONIC ?? undefined;

export const accounts: HardhatNetworkAccountUserConfig[] | undefined = MNEMONIC
  ? [...Array(10)].map((_, i) => {
      return {
        privateKey: ethers.Wallet.fromMnemonic(
          MNEMONIC,
          `m/44'/60'/0'/0/${i}`
        ).privateKey.toString(),
        balance: ethers.utils
          .parseEther([7, 9].includes(i) ? '0.0' : '1000000.0') // accounts 7 and 9 are given 0.0 ETH
          .toString(),
      };
    })
  : undefined;

export const namedAccountIndices = {
  admin: 0,
  supplier: 2,
  investor1: 4,
  investor2: 5,
  buyer: 6,
  employee: 7,
  mockPolygonBridge: 8,
  noriWallet: 9,
} as const;
