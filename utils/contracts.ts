import type { BaseContract } from 'ethers';

import type {
  FIFOMarket,
  LockedNORI,
  NORI,
  Removal,
  Certificate,
} from '../typechain-types';

export const connectToContract = async <
  TContract extends
    | FIFOMarket
    | NORI
    | Removal
    | Certificate
    | LockedNORI
    | BaseContract
>({
  contract,
  account,
  hre,
}: {
  contract: TContract;
  account?: string;
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<TContract> => {
  const signer = account
    ? await hre.ethers.getSigner(account)
    : contract.signer;
  return contract.connect(signer) as TContract;
};
