import { formatRemovalIdData } from '../utils/removal';

import { createRemovalTokenId, expect, setupTest } from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';
import { defaultRemovalTokenIdFixture } from '@/test/fixtures/removal';

describe('Removal', () => {
  describe('mintBatch', () => {
    describe('success', () => {
      it('should mint a batch of removals without listing any', async () => {
        const { fifoMarket, removal, hre } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = 0;
        const { supplier } = hre.namedAccounts;
        const defaultStartingVintage = 2016;
        const tokenIds = await Promise.all(
          removalBalances.map((amount, i) => {
            return createRemovalTokenId(removal, {
              supplierAddress: supplier,
              vintage: defaultStartingVintage + i,
            });
          })
        );
        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintBatch(
            hre.namedAccounts.supplier,
            removalBalances,
            tokenIds,
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
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId].toString());
        }
        // not listed to the fifoMarket
        const marketTotalSupply =
          await fifoMarket.numberOfActiveNrtsInMarketComputed();
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
        const tokenIds = [10, 11, 12, 13];
        const listNow = true;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintBatch(
            hre.namedAccounts.supplier,
            removalBalances,
            tokenIds,
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
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId].toString());
        }
        const marketTotalSupply =
          await fifoMarket.numberOfActiveNrtsInMarketComputed();
        expect(marketTotalSupply).to.equal(
          formatTokenAmount(expectedMarketSupply).toString()
        );
      });

      it('should list pre-minted removals for sale in the atomic marketplace', async () => {
        const { fifoMarket, removal } = await setupTest();
        const removalBalances = [100, 200, 300].map((balance) =>
          formatTokenAmount(balance)
        );
        const tokenIds = [4321, 12_344, 7892];
        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintBatch(
            hre.namedAccounts.supplier,
            removalBalances,
            tokenIds,
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
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId].toString());
        }
      });
    });
    describe('error', () => {
      describe('TokenIdExists', () => {
        it('should not mint a removal with a duplicate token id', async () => {
          const { fifoMarket, removal, hre } = await setupTest();
          const removalBalances = [100, 200, 300].map((balance) =>
            formatTokenAmount(balance)
          );
          const tokenIds = [0, 1, 1]; // duplicate token id
          const listNow = false;
          const packedData = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'bool'],
            [fifoMarket.address, listNow]
          );
          await expect(
            removal.mintBatch(
              hre.namedAccounts.supplier,
              removalBalances,
              tokenIds,
              packedData
            )
          ).revertedWith('TokenIdExists');
        });
      });
    });
  });
});
