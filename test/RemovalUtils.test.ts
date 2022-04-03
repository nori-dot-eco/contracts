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
      address: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      parcelId: 99039938560,
      vintage: 2018,
      country: 'US',
      state: 'IA',
      methodology: 2,
      methodologyVersion: 1,
    };

    const tokenId = createRemovalTokenId(expectedValues);

    const [
      retrievedAddress,
      retrievedParcelId,
      retrievedVintage,
      retrievedCountryCode,
      retrievedStateCode,
      retrievedMethodology,
      retrievedMethodologyVersion,
    ] = await Promise.all([
      harness.supplierAddressFromTokenId(tokenId),
      harness.parcelIdFromTokenId(tokenId),
      harness.vintageFromTokenId(tokenId),
      harness.countryCodeFromTokenId(tokenId),
      harness.stateCodeFromTokenId(tokenId),
      harness.methodologyFromTokenId(tokenId),
      harness.methodologyVersionFromTokenId(tokenId),
    ]);
    expect(retrievedAddress).equal(expectedValues.address);
    expect(retrievedParcelId).equal(expectedValues.parcelId.toString());
    expect(retrievedVintage).equal(expectedValues.vintage.toString());
    expect(retrievedCountryCode).equal(expectedValues.country);
    expect(retrievedStateCode).equal(expectedValues.state);
    expect(retrievedMethodology).equal(expectedValues.methodology);
    expect(retrievedMethodologyVersion).equal(
      expectedValues.methodologyVersion
    );
  });
});
