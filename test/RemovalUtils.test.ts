import type { RemovalTestHarness } from '../typechain-types/RemovalTestHarness';

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

describe('RemovalUtils', () => {
  it('can create a token id from the component fields and decode the token id', async () => {
    const { removalTestHarness: harness } = await setupTest();

    const removalData = {
      version: 0,
      methodology: 2,
      methodologyVersion: 1,
      vintage: 2018,
      country: 'US',
      admin1: 'IA',
      address: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      parcelId: 99039930,
    };

    const tokenId = await harness.createTokenIdV0(
      removalData.methodology,
      removalData.methodologyVersion,
      removalData.vintage,
      removalData.country,
      removalData.admin1,
      removalData.address,
      removalData.parcelId
    );

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
    expect(retrievedVersion).equal(removalData.version);
    expect(retrievedMethodology).equal(removalData.methodology);
    expect(retrievedMethodologyVersion).equal(removalData.methodologyVersion);
    expect(retrievedVintage).equal(removalData.vintage.toString());
    expect(retrievedCountryCode).equal(removalData.country);
    expect(retrievedAdmin1Code).equal(removalData.admin1);
    expect(retrievedAddress).equal(removalData.address);
    expect(retrievedParcelId).equal(removalData.parcelId.toString());
  });
});
