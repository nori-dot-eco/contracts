/* eslint-disable unicorn/prevent-abbreviations -- this file will eventually be replaced by foundry tests */
import { defaultRemovalTokenIdFixture } from '@/test/fixtures/removal';
import type {
  UnpackedRemovalIdV0Struct,
  UnpackedRemovalIdV0StructOutput,
} from '@/typechain-types/artifacts/contracts/Removal';
import { asciiStringToHexString, hexStringToAsciiString } from '@/utils/bytes';
import { expect, setupTest } from '@/test/helpers';

describe('RemovalIdLib', () => {
  // todo add struct encoding version
  // todo remove bytes encoding version
  it('can create a token id from the component fields and decode the token id', async () => {
    const { removalTestHarness: harness } = await setupTest();
    const countryCodeString = 'US';
    const subdivisionCodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = defaultRemovalTokenIdFixture;
    const removalId = await harness.createRemovalId(removalData);
    const unpackedRemovalId: UnpackedRemovalIdV0StructOutput =
      await harness.unpackRemovalIdV0(removalId);
    expect(unpackedRemovalId.idVersion).equal(removalData.idVersion);
    expect(unpackedRemovalId.methodology).equal(removalData.methodology);
    expect(unpackedRemovalId.methodologyVersion).equal(
      removalData.methodologyVersion
    );
    expect(unpackedRemovalId.vintage).equal(removalData.vintage);
    expect(unpackedRemovalId.country).equal(removalData.country);
    expect(unpackedRemovalId.subdivision).equal(removalData.subdivision);
    expect(unpackedRemovalId.supplierAddress).equal(
      removalData.supplierAddress
    );
    expect(unpackedRemovalId.subIdentifier).equal(removalData.subIdentifier);
    expect(hexStringToAsciiString(unpackedRemovalId.country)).equal(
      countryCodeString
    );
    expect(hexStringToAsciiString(unpackedRemovalId.subdivision)).equal(
      subdivisionCodeString
    );
  });
  // it('can create a token id from the component fields and decode the token id using maximum values for each field', async () => {
  //   const { removalTestHarness: harness, hre } = await setupTest();

  //   const countryCodeString = 'ZZ';
  //   const subdivisionCodeString = 'ZZ';
  //   const removalData: UnpackedRemovalIdV0Struct = {
  //     idVersion: 0, // can't max this field out bc 0 is only supported id version otherwise will revert
  //     methodology: 2 ** 4 - 1,
  //     methodologyVersion: 2 ** 4 - 1,
  //     vintage: 2 ** 16 - 1,
  //     country: asciiStringToHexString(countryCodeString),
  //     subdivision: asciiStringToHexString(subdivisionCodeString),
  //     supplierAddress: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF', // ethers returns EIP55 mixed-case checksum encoding
  //     subIdentifier: 2 ** 32 - 1,
  //   };

  //   const removalId = await harness.createRemovalId(
  //     formatRemovalIdData({ removalData, hre })
  //   );

  //   const unpackedRemovalId: UnpackedRemovalIdV0StructOutput =
  //     await harness.unpackRemovalIdV0(removalId);

  //   expect(unpackedRemovalId.idVersion).equal(removalData.idVersion);
  //   expect(unpackedRemovalId.methodology).equal(removalData.methodology);
  //   expect(unpackedRemovalId.methodologyVersion).equal(
  //     removalData.methodologyVersion
  //   );
  //   expect(unpackedRemovalId.vintage).equal(removalData.vintage);
  //   expect(unpackedRemovalId.country).equal(removalData.country);
  //   expect(unpackedRemovalId.subdivision).equal(removalData.subdivision);
  //   expect(unpackedRemovalId.supplierAddress).equal(
  //     removalData.supplierAddress
  //   );
  //   expect(unpackedRemovalId.subIdentifier).equal(removalData.subIdentifier);
  //   expect(hexStringToAsciiString(unpackedRemovalId.country)).equal(
  //     countryCodeString
  //   );
  //   expect(hexStringToAsciiString(unpackedRemovalId.subdivision)).equal(
  //     subdivisionCodeString
  //   );
  // });
  it('will revert if the wrong number of bytes are passed to `createRemovalId`', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const countryCodeString = 'US';
    const subdivisionCodeString = 'IA';
    const removalDataMissingParcelId = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      subdivision: asciiStringToHexString(subdivisionCodeString),
      supplierAddress: hre.namedAccounts.supplier,
    };
    await expect(harness.createRemovalId(removalDataMissingParcelId as any)).to
      .be.reverted;
  });
  it('will revert if the methodology does not fit in one nibble', async () => {
    const { removalTestHarness: harness } = await setupTest();
    const countryCodeString = 'US';
    const subdivisionCodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 16, // too large
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      subdivision: asciiStringToHexString(subdivisionCodeString),
      supplierAddress: hre.namedAccounts.supplier,
      subIdentifier: 99_039_930,
    };
    await expect(harness.createRemovalId(removalData)).to.be.reverted;
  });
  it('will revert if the location data includes characters that are not capital letters', async () => {
    const { removalTestHarness: harness, hre } = await setupTest();
    const countryCodeString = 'uS'; // lowercase letter
    const subdivisionCodeString = 'IA';
    const removalData: UnpackedRemovalIdV0Struct = {
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: asciiStringToHexString(countryCodeString),
      subdivision: asciiStringToHexString(subdivisionCodeString),
      supplierAddress: hre.namedAccounts.supplier,
      subIdentifier: 99_039_930,
    };
    await expect(harness.createRemovalId(removalData)).revertedWith(
      `UncapitalizedString`
    );
  });
});