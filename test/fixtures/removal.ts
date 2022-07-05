import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/artifacts/contracts/Removal';

export const defaultRemovalTokenIdFixture: UnpackedRemovalIdV0Struct = {
  idVersion: 0,
  methodology: 1,
  methodologyVersion: 0,
  vintage: 2018,
  country: '0x5553', // asciiStringToHexString('US')
  subdivision: '0x4941', // asciiStringToHexString('IA')
  supplierAddress: hre.namedAccounts.supplier, // hre.namedAccounts.supplier
  subIdentifier: 99_039_930, // parcel id
};
