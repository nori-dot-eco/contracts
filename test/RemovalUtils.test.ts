import type { RemovalTestHarness } from '../typechain-types/RemovalTestHarness';

import { createRemovalTokenId, expect } from '@/test/helpers';

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

describe('RemovalUtils', () => {
  it('can extract the data fields encoded in a removal token id', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const expectedValues = {
      version: 0,
      methodology: 2,
      methodologyVersion: 1,
      vintage: 2018,
      country: 'US',
      admin1: 'IA',
      address: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      parcelId: 99039930,
    };

    const tokenId = createRemovalTokenId(expectedValues);

    const [
      retrievedVersion,
      retrievedMethodology,
      retrievedMethodologyVersion,
      retrievedVintage,
      retrievedCountryCode,
      retrievedAdmin1Code,
      retrievedAddress,
      retrievedParcelId,
    ] = await Promise.all([
      harness.versionFromTokenId(tokenId),
      harness.methodologyFromTokenId(tokenId),
      harness.methodologyVersionFromTokenId(tokenId),
      harness.vintageFromTokenId(tokenId),
      harness.countryCodeFromTokenId(tokenId),
      harness.admin1CodeFromTokenId(tokenId),
      harness.supplierAddressFromTokenId(tokenId),
      harness.parcelIdFromTokenId(tokenId),
    ]);
    expect(retrievedVersion).equal(expectedValues.version);
    expect(retrievedMethodology).equal(expectedValues.methodology);
    expect(retrievedMethodologyVersion).equal(
      expectedValues.methodologyVersion
    );
    expect(retrievedVintage).equal(expectedValues.vintage.toString());
    expect(retrievedCountryCode).equal(expectedValues.country);
    expect(retrievedAdmin1Code).equal(expectedValues.admin1);
    expect(retrievedAddress).equal(expectedValues.address);
    expect(retrievedParcelId).equal(expectedValues.parcelId.toString());
  });
});
