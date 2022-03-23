import type { ContractInstances } from '@/test/helpers';
import { createRemovalTokenId, expect, createFixture } from '@/test/helpers';
import { deploy } from '@/deploy/0_deploy_contracts';
import { formatTokenAmount } from '@/utils/units';
import type { Contracts } from '@/utils/deploy';

const setupTest = createFixture(
  async (
    hre
  ): Promise<ContractInstances & { hre: CustomHardHatRuntimeEnvironment }> => {
    // todo replace with setupTestEnvironment
    hre.ethernalSync = false;
    const contracts = (await deploy(hre)) as Required<Contracts>;
    return {
      hre,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      fifoMarket: contracts.FIFOMarket,
      lNori: contracts.LockedNORI,
    };
  }
);

describe('Removal', () => {
  describe('Minting removals', () => {
    it('should mint a batch of removals without listing any', async () => {
      const { fifoMarket, removal, hre } = await setupTest();
      const removalBalances = [100, 200, 300, 400].map((balance) =>
        formatTokenAmount(balance)
      );
      const expectedMarketSupply = 0;
      const removalVintages = [2018, 2019, 2020, 2021];
      const listNow = false;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );
      const tokenIds = [0, 1, 2, 3];
      await expect(
        removal.mintBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          removalVintages,
          packedData
        )
      )
        .to.emit(removal, 'TransferBatch')
        .withArgs(
          hre.namedAccounts.admin,
          hre.ethers.constants.AddressZero,
          hre.namedAccounts.supplier,
          tokenIds,
          removalBalances
        );
      const balances = await Promise.all(
        tokenIds.map(async (tokenId) => {
          return removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(removalBalances[tokenId].toString());
      });
      // not listed to the fifoMarket
      const marketTotalSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        formatTokenAmount(expectedMarketSupply).toString()
      );
    });
    it('should mint and list a batch of removals in the same transaction', async () => {
      const { fifoMarket, removal } = await setupTest();
      const removalBalances = [100, 200, 300, 400].map((balance) =>
        formatTokenAmount(balance)
      );
      const expectedMarketSupply = 1000;
      const removalVintages = [2018, 2019, 2020, 2021];
      const listNow = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );
      const tokenIds = [0, 1, 2, 3];
      await expect(
        removal.mintBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          removalVintages,
          packedData
        )
      )
        .to.emit(removal, 'TransferBatch')
        .withArgs(
          hre.namedAccounts.admin,
          hre.ethers.constants.AddressZero,
          hre.namedAccounts.supplier,
          tokenIds,
          removalBalances
        );
      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
          return removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(removalBalances[tokenId].toString());
      });
      const marketTotalSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        formatTokenAmount(expectedMarketSupply).toString()
      );
    });
  });
  describe('Listing removals for sale', () => {
    it('should list pre-minted removals for sale in the atomic marketplace', async () => {
      const { fifoMarket, removal } = await setupTest();
      const removalBalances = [100, 200, 300].map((balance) =>
        formatTokenAmount(balance)
      );
      const removalVintages = [2018, 2019, 2020];
      const listNow = false;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );
      const tokenIds = [0, 1, 2];
      await expect(
        removal.mintBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          removalVintages,
          packedData
        )
      )
        .to.emit(removal, 'TransferBatch')
        .withArgs(
          hre.namedAccounts.admin,
          hre.ethers.constants.AddressZero,
          hre.namedAccounts.supplier,
          tokenIds,
          removalBalances
        );
      await expect(
        removal.safeBatchTransferFrom(
          hre.namedAccounts.supplier,
          fifoMarket.address,
          tokenIds,
          removalBalances,
          ethers.utils.formatBytes32String('0x0')
        )
      )
        .to.emit(removal, 'TransferBatch')
        .withArgs(
          hre.namedAccounts.admin,
          hre.namedAccounts.supplier,
          fifoMarket.address,
          tokenIds,
          removalBalances
        );
      // market contract should have a balance for each listed tokenId
      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
          return removal.balanceOf(fifoMarket.address, tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(removalBalances[tokenId].toString());
      });
    });
  });
  describe('Token ids', () => {
    it('can be separated into their component fields', async () => {
      const Removal = await ethers.getContractFactory('Removal');
      const removal = await Removal.deploy();

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
        removal.supplierAddressFromTokenId(tokenId),
        removal.parcelIdFromTokenId(tokenId),
        removal.vintageFromTokenId(tokenId),
        removal.countryCodeFromTokenId(tokenId),
        removal.stateCodeFromTokenId(tokenId),
        removal.methodologyFromTokenId(tokenId),
        removal.methodologyVersionFromTokenId(tokenId),
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
});
