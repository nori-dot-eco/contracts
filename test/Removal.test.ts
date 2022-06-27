import { SECONDS_IN_10_YEARS } from '@/test/helpers/restricted-nori';
import {
  createRemovalTokenId,
  expect,
  setupTest,
  createBatchMintData,
  getLatestBlockTime,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('Removal', () => {
  describe('mintBatch', () => {
    describe('success', () => {
      it('should mint a batch of removals without listing any', async () => {
        const { fifoMarket, removal, hre } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = 0;
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
          fifoMarket,
          listNow,
        });
        await expect(
          removal.mintBatch(supplier, removalBalances, tokenIds, packedData)
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            admin,
            hre.ethers.constants.AddressZero,
            supplier,
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
      it('should mint and list a batch of removals in the same transaction and create restriction schedules', async () => {
        const { fifoMarket, removal } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = 1000;
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
          fifoMarket,
          listNow,
        });
        await expect(
          removal.mintBatch(supplier, removalBalances, tokenIds, packedData)
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            admin,
            hre.ethers.constants.AddressZero,
            supplier,
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

      it('should list pre-minted removals for sale in the atomic marketplace and create restriction schedules', async () => {
        const { fifoMarket, removal, rNori } = await setupTest();
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
          fifoMarket,
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
          )
          .to.emit(rNori, 'ScheduleCreated')
          .withArgs(
            projectId,
            scheduleStartTime,
            scheduleStartTime + SECONDS_IN_10_YEARS
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
          // duplicate token id
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
            fifoMarket,
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
  describe('getters', () => {
    describe('getScheduleStartTimeForRemoval', () => {
      it('should return the restriction schedule start time for a removal id', async () => {
        const { fifoMarket, removal, hre } = await setupTest();
        const removalBalances = [formatTokenAmount(100)];
        const tokenIds = await Promise.all(
          [2016].map((vintage) =>
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
        const scheduleStartTime = await getLatestBlockTime({ hre });
        const packedData = await createBatchMintData({
          hre,
          fifoMarket,
          listNow,
          scheduleStartTime,
        });
        await removal.mintBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          tokenIds,
          packedData
        );
        const projectId = await removal.getProjectIdForRemoval(tokenIds[0]);
        const scheduleData = await removal.getScheduleDataForProjectId(
          projectId
        );
        expect(scheduleData.startTime).to.equal(scheduleStartTime);
      });
    });
  });
});
