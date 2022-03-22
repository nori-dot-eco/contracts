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

      const vintage = 2018;
      // const parcelId = 6530799039938560;
      const parcelId = 42;
      // const tokenId = 0x000007e2;
      const padding = ethers.utils.zeroPad(ethers.utils.hexlify(0), 20);
      const vintageUint8 = ethers.utils.zeroPad(
        ethers.utils.hexlify(vintage),
        4
      );
      const parcelIdUint8 = ethers.utils.zeroPad(
        ethers.utils.hexlify(parcelId),
        8
      );
      const tokenId = new Uint8Array([
        ...padding,
        ...parcelIdUint8,
        ...vintageUint8,
      ]);
      console.log('tokenId hex', tokenId.toString());
      const retrievedVintage = await removal.vintageFromTokenId(tokenId);
      const retrievedParcelId = await removal.parcelIdFromTokenId(tokenId);
      console.log('retrieved vintage: ', retrievedVintage);
      console.log('retrieved parcelId: ', retrievedParcelId);
      expect(retrievedVintage).equal(vintage.toString());
      expect(retrievedParcelId).equal(parcelId.toString());
    });
  });
});
