import type {
  RemovalTestHarness,
  UnpackedRemovalIdV0Struct,
  UnpackedRemovalIdV0StructOutput,
} from '../typechain-types/RemovalTestHarness';
import { asciiStringToHexString, hexStringToAsciiString } from '../utils/bytes';

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

describe('RemovalUtils', () => {
  it('can create a token id from the component fields and decode the token id', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'US';
    const admin1CodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 1,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      admin1: asciiStringToHexString(admin1CodeString),
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      subIdentifier: 99039930, // parcel id
    };

    const removalId = await harness.createRemovalId(
      formatRemovalIdData(removalData)
    );

    const unpackedRemovalId: UnpackedRemovalIdV0StructOutput =
      await harness.unpackRemovalIdV0(removalId);

    expect(unpackedRemovalId.idVersion).equal(removalData.idVersion);
    expect(unpackedRemovalId.methodology).equal(removalData.methodology);
    expect(unpackedRemovalId.methodologyVersion).equal(
      removalData.methodologyVersion
    );
    expect(unpackedRemovalId.vintage).equal(removalData.vintage);
    expect(unpackedRemovalId.country).equal(removalData.country);
    expect(unpackedRemovalId.admin1).equal(removalData.admin1);
    expect(unpackedRemovalId.supplierAddress).equal(
      removalData.supplierAddress
    );
    expect(unpackedRemovalId.subIdentifier).equal(removalData.subIdentifier);
    expect(hexStringToAsciiString(unpackedRemovalId.country)).equal(
      countryCodeString
    );
    expect(hexStringToAsciiString(unpackedRemovalId.admin1)).equal(
      admin1CodeString
    );
  });
  it('can create a token id from the component fields and decode the token id using maximum values for each field', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'ZZ';
    const admin1CodeString = 'ZZ';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0, // can't max this field out bc 0 is only supported id version otherwise will revert
      methodology: 2 ** 4 - 1,
      methodologyVersion: 2 ** 4 - 1,
      vintage: 2 ** 16 - 1,
      country: asciiStringToHexString(countryCodeString),
      admin1: asciiStringToHexString(admin1CodeString),
      supplierAddress: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF', // ethers returns EIP55 mixed-case checksum encoding
      subIdentifier: 2 ** 32 - 1,
    };

    const removalId = await harness.createRemovalId(
      formatRemovalIdData(removalData)
    );

    const unpackedRemovalId: UnpackedRemovalIdV0StructOutput =
      await harness.unpackRemovalIdV0(removalId);

    expect(unpackedRemovalId.idVersion).equal(removalData.idVersion);
    expect(unpackedRemovalId.methodology).equal(removalData.methodology);
    expect(unpackedRemovalId.methodologyVersion).equal(
      removalData.methodologyVersion
    );
    expect(unpackedRemovalId.vintage).equal(removalData.vintage);
    expect(unpackedRemovalId.country).equal(removalData.country);
    expect(unpackedRemovalId.admin1).equal(removalData.admin1);
    expect(unpackedRemovalId.supplierAddress).equal(
      removalData.supplierAddress
    );
    expect(unpackedRemovalId.subIdentifier).equal(removalData.subIdentifier);
    expect(hexStringToAsciiString(unpackedRemovalId.country)).equal(
      countryCodeString
    );
    expect(hexStringToAsciiString(unpackedRemovalId.admin1)).equal(
      admin1CodeString
    );
  });
  it('will revert if the wrong number of bytes are passed to `createRemovalId`', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'US';
    const admin1CodeString = 'IA';
    const removalDataMissingParcelId = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 1,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      admin1: asciiStringToHexString(admin1CodeString),
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
    };
    const encodedRemovalDataTooShort = hre.ethers.utils.defaultAbiCoder.encode(
      ['uint8', 'uint8', 'uint8', 'uint16', 'bytes2', 'bytes2', 'address'],
      Object.values(removalDataMissingParcelId)
    );

    await expect(
      harness.createRemovalId(encodedRemovalDataTooShort)
    ).revertedWith('removalData contains wrong number of bytes');
  });
  it('will revert if the methodology does not fit in one nibble', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'US';
    const admin1CodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 16, // too large
      methodologyVersion: 1,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      admin1: asciiStringToHexString(admin1CodeString),
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      subIdentifier: 99039930,
    };

    expect(
      harness.createRemovalId(formatRemovalIdData(removalData))
    ).revertedWith('Methodology too large');
  });
  it('will revert if the location data includes characters that are not capital letters', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'uS'; // lowercase letter
    const admin1CodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 1,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      admin1: asciiStringToHexString(admin1CodeString),
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      subIdentifier: 99039930,
    };

    await expect(
      harness.createRemovalId(formatRemovalIdData(removalData))
    ).revertedWith('Invalid ASCII');
  });
});
