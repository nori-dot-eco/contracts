import { BigNumber } from 'ethers';

import { sum } from '@/utils/math';
import { SECONDS_IN_10_YEARS } from '@/test/helpers/restricted-nori';
import { Zero, AddressZero } from '@/constants/units';
import { defaultPackedRemovalTokenIdFixture } from '@/test/fixtures/removal';
import {
  createBatchMintData,
  createRemovalTokenId,
  expect,
  getLatestBlockTime,
  setupTest,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('Removal', () => {
  describe('balanceOf', () => {
    it('should return the balance for the token ID owned by the account', async () => {
      const { removal, hre, removalAmounts, listedRemovalIds } =
        await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                listNow: false,
                removals: [{ amount: 100 }],
              },
            },
          },
        });
      expect(
        await removal.balanceOf(hre.namedAccounts.supplier, listedRemovalIds[0])
      )
        .to.be.gt(Zero)
        .and.to.equal(removalAmounts[0]);
    });
  });
  describe('batchGetHoldbackPercentages', () => {
    it('should update the holdback percentage for a removal after it has been minted', async () => {
      const holdbackPercentage = BigNumber.from(40);
      const { removal, listedRemovalIds } = await setupTest({
        // todo how would this look using mocks only? Probably just mock balance, then list it?
        userFixtures: {
          supplier: {
            removalDataToList: {
              holdbackPercentage,
              removals: [{ amount: 100 }],
            },
          },
        },
      });
      const updatedHoldback = BigNumber.from(20);
      await removal.batchSetHoldbackPercentage(
        [listedRemovalIds[0]],
        updatedHoldback
      );
      const [retrievedHoldbackPercentages] =
        await removal.batchGetHoldbackPercentages([listedRemovalIds[0]]);
      expect(retrievedHoldbackPercentages).equal(updatedHoldback);
    });
    it('should revert if trying to set a holdback percentage for a removal that does not exist', async () => {
      const { removal } = await setupTest();
      const holdbackPercentage = BigNumber.from(40);
      await expect(
        removal.batchSetHoldbackPercentage(
          [defaultPackedRemovalTokenIdFixture],
          holdbackPercentage
        )
      ).to.be.revertedWith('TokenIdDoesNotExist');
    });
  });
  describe('mintBatch', () => {
    describe('success', () => {
      it('should set a holdback percentage for a removal', async () => {
        const holdbackPercentage = BigNumber.from(40);
        const { removal, listedRemovalIds } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                holdbackPercentage,
                removals: [{ amount: 100 }],
              },
            },
          },
        });
        const [listedTokensHoldbackPercentage] =
          await removal.batchGetHoldbackPercentages(listedRemovalIds);
        expect(listedTokensHoldbackPercentage).to.equal(holdbackPercentage);
      });
      it('should mint a batch of removals without listing any', async () => {
        const { market, removal, hre } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const { supplier, admin } = hre.namedAccounts;
        const defaultStartingVintage = 2016;
        const tokenIds = await Promise.all(
          removalBalances.map((_, index) => {
            return createRemovalTokenId({
              removal,
              hre,
              removalData: {
                supplierAddress: supplier,
                vintage: defaultStartingVintage + index,
              },
            });
          })
        );
        const listNow = false;
        const packedData = await createBatchMintData({
          hre,
          market,
          listNow,
        });
        await expect(
          removal.mintBatch(supplier, removalBalances, tokenIds, packedData)
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(admin, AddressZero, supplier, tokenIds, removalBalances);
        const balances = await Promise.all(
          tokenIds.map(async (tokenId) => {
            return removal.totalSupply(tokenId);
          })
        );
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId]);
        }
        const marketTotalSupply = await market.totalActiveSupply();
        expect(marketTotalSupply).to.equal(Zero);
      });
      it('should mint and list a batch of removals in the same transaction and create restriction schedules', async () => {
        const { market, removal } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = sum(removalBalances);
        const { supplier, admin } = hre.namedAccounts;
        const defaultStartingVintage = 2016;
        const tokenIds = await Promise.all(
          removalBalances.map((_, index) => {
            return createRemovalTokenId({
              removal,
              hre,
              removalData: {
                supplierAddress: supplier,
                vintage: defaultStartingVintage + index,
              },
            });
          })
        );
        const listNow = true;
        const packedData = await createBatchMintData({
          hre,
          market,
          listNow,
        });
        await expect(
          removal.mintBatch(supplier, removalBalances, tokenIds, packedData)
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(admin, AddressZero, supplier, tokenIds, removalBalances);
        const balances = await Promise.all(
          tokenIds.map((tokenId) => {
            return removal.totalSupply(tokenId);
          })
        );
        for (const [tokenId, balance] of balances.entries()) {
          expect(balance).to.equal(removalBalances[tokenId]);
        }
        expect(await market.totalActiveSupply()).to.equal(
          expectedMarketSupply
        );
      });
      it('should list pre-minted removals for sale in the atomic marketplace and create restriction schedules', async () => {
        const { market, removal, rNori } = await setupTest();
        const removalBalances = [100, 200, 300].map((balance) =>
          formatTokenAmount(balance)
        );
        const tokenIds = await Promise.all(
          [2016, 2017, 2018].map((vintage) =>
            createRemovalTokenId({
              removal,
              hre,
              removalData: {
                vintage,
              },
            })
          )
        );
        const scheduleStartTime = await getLatestBlockTime({ hre });
        const projectId = 1_234_567_890;
        const listNow = false;
        const packedData = await createBatchMintData({
          hre,
          market,
          listNow,
          projectId,
          scheduleStartTime,
        });
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
            AddressZero,
            hre.namedAccounts.supplier,
            tokenIds,
            removalBalances
          );
        await expect(
          removal.safeBatchTransferFrom(
            hre.namedAccounts.supplier,
            market.address,
            tokenIds,
            removalBalances,
            ethers.utils.formatBytes32String('0x0')
          )
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            hre.namedAccounts.admin,
            hre.namedAccounts.supplier,
            market.address,
            tokenIds,
            removalBalances
          )
          .to.emit(rNori, 'ScheduleCreated')
          .withArgs(
            projectId,
            scheduleStartTime,
            scheduleStartTime + SECONDS_IN_10_YEARS
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
    describe('error', () => {
      describe('TokenIdExists', () => {
        it('should not mint a removal with a duplicate token id', async () => {
          const { market, removal, hre } = await setupTest();
          const removalBalances = [100, 200, 300].map((balance) =>
            formatTokenAmount(balance)
          );
          const tokenIds = await Promise.all(
            [2016, 2017, 2017].map((vintage) =>
              createRemovalTokenId({
                removal,
                hre,
                removalData: {
                  vintage,
                },
              })
            )
          );
          const listNow = false;
          const packedData = await createBatchMintData({
            hre,
            market,
            listNow,
          });
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
  describe('getScheduleDataForProjectId', () => {
    it('should return the restriction schedule start time for a removal id', async () => {
      const { removal, listedRemovalIds, scheduleStartTime } = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              listNow: false,
              removals: [{ amount: 100 }],
            },
          },
        },
      });
      const projectId = await removal.getProjectIdForRemoval(
        listedRemovalIds[0]
      );
      const { startTime } = await removal.getScheduleDataForProjectId(
        projectId
      );
      expect(startTime).to.be.gt(Zero).and.to.equal(scheduleStartTime);
    });
  });
});
