import type { ERC1155PresetPausableNonTransferrable } from '@/typechain-types';

export const createBatchMintData = ({
  hre,
  amount,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  amount: number;
}): Parameters<ERC1155PresetPausableNonTransferrable['mintBatch']>[3] => {
  const packedData = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    Object.values({ amount })
  );
  return packedData;
};
