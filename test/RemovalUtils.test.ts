import type {
  RemovalTestHarness,
  UnpackedRemovalIdV0Struct,
  UnpackedRemovalIdV0StructOutput,
} from '../typechain-types/RemovalTestHarness';

import { expect } from '@/test/helpers';

const setupTest = hre.deployments.createFixture(
  async (
    hre
  ): Promise<{
    removalTestHarness: RemovalTestHarness;
  }> => {
    hre.ethernalSync = false;
    const RemovalTestHarness = await hre.ethers.getContractFactory(
      'RemovalTestHarness' as unknown as ContractNames
    );
    const removalTestHarness =
      (await RemovalTestHarness.deploy()) as RemovalTestHarness;
    return {
      removalTestHarness,
    };
  }
);

const formatRemovalIdData = (
  removalData: UnpackedRemovalIdV0Struct
): string => {
  return hre.ethers.utils.defaultAbiCoder.encode(
    [
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'string',
      'string',
      'address',
      'uint256',
    ],
    Object.values(removalData)
  );
};
describe('RemovalUtils', () => {
  it('can create a token id from the component fields and decode the token id', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 2,
      methodologyVersion: 1,
      vintage: 2018,
      country: 'US',
      admin1: 'IA',
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      subIdentifier: 99039930, // parcel id
    };

    const removalId = await harness.createRemovalId(
      formatRemovalIdData(removalData)
    );

    const unpackedRemovalId: UnpackedRemovalIdV0StructOutput =
      await harness.unpackRemovalId(removalId);

    expect(unpackedRemovalId.idVersion).equal(removalData.idVersion);
    expect(unpackedRemovalId.methodology).equal(removalData.methodology);
    expect(unpackedRemovalId.methodologyVersion).equal(
      removalData.methodologyVersion
    );
    expect(unpackedRemovalId.vintage).equal(removalData.vintage.toString());
    expect(unpackedRemovalId.country).equal(removalData.country);
    expect(unpackedRemovalId.admin1).equal(removalData.admin1);
    expect(unpackedRemovalId.supplierAddress).equal(
      removalData.supplierAddress
    );
    expect(unpackedRemovalId.subIdentifier).equal(
      removalData.subIdentifier.toString()
    );
  });
});
