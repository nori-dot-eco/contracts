import { BigNumber } from 'ethers';

import { defaultRemovalTokenIdFixture } from './fixtures/removal';

import { sum } from '@/utils/math';
import { Zero, AddressZero } from '@/constants/units';
import { createBatchMintData, expect, setupTest } from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('Removal', () => {
  describe('balanceOf', () => {
    it('should return the balance for the token ID owned by the account', async () => {
      const {
        removal,
        hre,
        removalAmounts,
        listedRemovalIds,
        removalTestHarness,
      } = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              listNow: false,
              removals: [{ amount: formatTokenAmount(100) }],
            },
          },
        },
      });
      expect(
        await removal.balanceOf(
          hre.namedAccounts.supplier,
          removalTestHarness.createRemovalId(listedRemovalIds[0])
        )
      )
        .to.be.gt(Zero)
        .and.to.equal(removalAmounts[0]);
    });
  });
  describe('mintBatch', () => {
    describe('success', () => {
      it('should mint a batch of removals without listing any', async () => {
        const { removal, hre, removalTestHarness } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const { supplier, admin } = hre.namedAccounts;
        const defaultStartingVintage = 2016;
        const tokenIds = await Promise.all(
          removalBalances.map((_, index) => {
            return {
              ...defaultRemovalTokenIdFixture,
              vintage: defaultStartingVintage + index,
            };
          })
        );
        const data = await createBatchMintData({
          hre,
        });
        await expect(
          removal.mintBatch(supplier, removalBalances, tokenIds, data.projectId)
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            admin,
            AddressZero,
            supplier,
            await Promise.all(
              tokenIds.map((id) => removalTestHarness.createRemovalId(id))
            ),
            removalBalances
          );
        const balances = await Promise.all(
          tokenIds.map(async (tokenId) => {
            return removal.totalSupply(
              removalTestHarness.createRemovalId(tokenId)
            );
          })
        );
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId]);
        }
        const marketTotalSupply = await removal.getMarketBalance();
        expect(marketTotalSupply).to.equal(Zero);
      });
      it('should mint and list a batch of removals in the same transaction', async () => {
        const { market, removal, removalTestHarness } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = sum(removalBalances);
        const { admin } = hre.namedAccounts;
        const defaultStartingVintage = 2016;
        const tokenIds = await Promise.all(
          removalBalances.map((_, index) => {
            return {
              ...defaultRemovalTokenIdFixture,
              vintage: defaultStartingVintage + index,
            };
          })
        );
        const data = await createBatchMintData({
          hre,
        });
        await expect(
          removal.mintBatch(
            market.address,
            removalBalances,
            tokenIds,
            data.projectId
          )
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            admin,
            AddressZero,
            market.address,
            await Promise.all(
              tokenIds.map(async (id) => removalTestHarness.createRemovalId(id))
            ),
            removalBalances
          );
        const balances = await Promise.all(
          tokenIds.map(async (tokenId) => {
            return removal.totalSupply(
              await removalTestHarness.createRemovalId(tokenId)
            );
          })
        );
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId]);
        }
        expect(await removal.getMarketBalance()).to.equal(expectedMarketSupply);
      });
      it('should list pre-minted removals for sale in the market', async () => {
        const { market, removal, removalTestHarness } = await setupTest();
        const { namedAccounts } = hre;
        const removalBalances = [100, 200, 300].map((balance) =>
          formatTokenAmount(balance)
        );
        const removals = await Promise.all(
          [2016, 2017, 2018].map((vintage) => ({
            ...defaultRemovalTokenIdFixture,
            vintage,
          }))
        );
        const tokenIds = await Promise.all(
          removals.map((r) => removalTestHarness.createRemovalId(r))
        );
        const data = await createBatchMintData({
          hre,
        });
        await expect(
          removal.mintBatch(
            namedAccounts.supplier,
            removalBalances,
            removals,
            data.projectId
          )
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            namedAccounts.admin,
            AddressZero,
            namedAccounts.supplier,
            tokenIds,
            removalBalances
          );
        await expect(
          removal.multicall(
            tokenIds.map((id, index) =>
              removal.interface.encodeFunctionData('consign', [
                namedAccounts.supplier,
                id,
                removalBalances[index],
              ])
            )
          )
        )
          .to.emit(removal, 'TransferSingle')
          .withArgs(
            namedAccounts.admin,
            namedAccounts.supplier,
            market.address,
            tokenIds[0],
            removalBalances[0]
          )
          .to.emit(removal, 'TransferSingle')
          .withArgs(
            namedAccounts.admin,
            namedAccounts.supplier,
            market.address,
            tokenIds[1],
            removalBalances[1]
          )
          .to.emit(removal, 'TransferSingle')
          .withArgs(
            namedAccounts.admin,
            namedAccounts.supplier,
            market.address,
            tokenIds[2],
            removalBalances[2]
          );
        const balances = await Promise.all(
          tokenIds.map((tokenId) => {
            return removal.balanceOf(market.address, tokenId);
          })
        );
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId]);
        }
      });
    });
  });
});
