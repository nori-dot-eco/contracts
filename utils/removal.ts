import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/contracts/Removal';

export const formatRemovalIdData = ({
  hre,
  removalData,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  removalData: UnpackedRemovalIdV0Struct;
}): string => {
  return hre.ethers.utils.defaultAbiCoder.encode(
    [
      'uint8',
      'uint8',
      'uint8',
      'uint16',
      'bytes2',
      'bytes2',
      'address',
      'uint32',
    ],
    Object.values(removalData)
  );
};
