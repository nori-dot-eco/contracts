import type { BigNumber } from 'ethers';

import { asciiStringToHexString } from '@/utils/bytes';
import type {
  UnpackedRemovalIdV0Struct,
  Removal,
} from '@/typechain-types/Removal';

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

// todo de-dupe from test/helpers/index
export const createRemovalTokenId = async ({
  removalInstance,
  options,
  hre,
}: {
  removalInstance: any; // todo Removal (need typechain updates from master merged)
  options?: Partial<UnpackedRemovalIdV0Struct>;
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<BigNumber> => {
  const defaultRemovalData: UnpackedRemovalIdV0Struct = {
    idVersion: 0,
    methodology: 1,
    methodologyVersion: 1,
    vintage: 2018,
    country: asciiStringToHexString('US'),
    subdivision: asciiStringToHexString('IA'),
    supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
    subIdentifier: 99_039_930, // parcel id
  };
  const removalData = { ...defaultRemovalData, ...options };
  const abiEncodedRemovalData = formatRemovalIdData({ hre, removalData });
  const removalId = await removalInstance.createRemovalId(
    abiEncodedRemovalData
  );
  return removalId;
};
