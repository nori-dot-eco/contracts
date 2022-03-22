import type { ContractInstances } from '@/test/helpers';
import { deploy } from '@/deploy/0_deploy_contracts';
import { expect, createFixture } from '@/test/helpers';
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
  describe('bytes fun', () => {
    it('should get the vintage', async () => {
      // const { removal } = await setupTest();
      const Removal = await ethers.getContractFactory('Removal');
      const removal = await Removal.deploy();

      const asciiToUint8Array = (str: string): Uint8Array => {
        const chars = [];
        for (let i = 0; i < str.length; ++i) {
          chars.push(str.charCodeAt(i));
        }
        return new Uint8Array(chars);
      };

      const address = '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450';
      const parcelId = 99039938560; // TODO figure out how we want to force a real datastore ID from 8 bytes into 5
      const vintage = 2018;
      const country = 'US';
      const state = 'IA';
      const methodology = 2;
      const methodologyVersion = 1;

      const addressUint8 = ethers.utils.arrayify(address);
      const parcelIdUint8 = ethers.utils.zeroPad(
        ethers.utils.hexlify(parcelId),
        5
      );
      const vintageUint8 = ethers.utils.zeroPad(
        ethers.utils.hexlify(vintage),
        2
      );

      const countryUint8 = asciiToUint8Array(country);
      const stateUint8 = asciiToUint8Array(state);
      const methodologyAndVersionUint8 = ethers.utils.zeroPad(
        `0x${methodology.toString(16)}${methodologyVersion.toString(16)}`,
        1
      );

      const tokenId = new Uint8Array([
        ...addressUint8,
        ...parcelIdUint8,
        ...vintageUint8,
        ...countryUint8,
        ...stateUint8,
        ...methodologyAndVersionUint8,
      ]);
      console.log('tokenId hex', tokenId.toString());

      const retrievedAddress = await removal.supplierAddressFromTokenId(
        tokenId
      );
      const retrievedParcelId = await removal.parcelIdFromTokenId(tokenId);
      const retrievedVintage = await removal.vintageFromTokenId(tokenId);
      const retrievedCountryCode = await removal.countryCodeFromTokenId(
        tokenId
      );
      const retrievedStateCode = await removal.stateCodeFromTokenId(tokenId);
      const retrievedMethodology = await removal.methodologyFromTokenId(
        tokenId
      );
      const retrievedMethodologyVersion =
        await removal.methodologyVersionFromTokenId(tokenId);

      console.log('retrieved address: ', retrievedAddress);
      console.log('retrieved parcelId: ', retrievedParcelId);
      console.log('retrieved vintage: ', retrievedVintage);
      console.log('retrieved countryCode: ', retrievedCountryCode);
      console.log('retrieved stateCode: ', retrievedStateCode);
      console.log('retrieved methodology: ', retrievedMethodology);
      console.log(
        'retrieved methodology version: ',
        retrievedMethodologyVersion
      );
      expect(retrievedAddress).equal(address);
      expect(retrievedParcelId).equal(parcelId.toString());
      expect(retrievedVintage).equal(vintage.toString());
      expect(retrievedCountryCode).equal(country);
      expect(retrievedStateCode).equal(state);
      expect(retrievedMethodology).equal(methodology);
      expect(retrievedMethodologyVersion).equal(methodologyVersion);
    });
  });
});
