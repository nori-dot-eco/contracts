import type {
  UnpackedRemovalIdV0Struct,
  Removal,
} from '@/typechain-types/contracts/Removal';

export const formatRemovalIdData = ({
  hre,
  removalData,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  removalData: UnpackedRemovalIdV0Struct;
}): Parameters<Removal['createRemovalId']>[0] => {
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
