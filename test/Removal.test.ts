import { BigNumber } from 'ethers';

import { sum } from '@/utils/math';
import { SECONDS_IN_10_YEARS } from '@/test/helpers/restricted-nori';
import { Zero, AddressZero } from '@/constants/units';
import {
  createBatchMintData,
  createRemovalTokenId,
  expect,
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
        userFixtures: {
          supplier: {
            removalDataToList: {
              holdbackPercentage,
              removals: [{ amount: 100 }],
            },
          },
        },
      });
      const [retrievedHoldbackPercentages] =
        await removal.batchGetHoldbackPercentages([listedRemovalIds[0]]);
      expect(retrievedHoldbackPercentages).to.equal(holdbackPercentage);
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
        expect(listedTokensHoldbackPercentage).equal(holdbackPercentage);
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
        const marketTotalSupply = await removal.getMarketBalance();
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
        expect(await removal.getMarketBalance()).to.equal(expectedMarketSupply);
      });
      it('should list pre-minted removals for sale in the atomic marketplace and create restriction schedules', async () => {
        const { market, removal, rNori } = await setupTest();
        const { namedAccounts } = hre;
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
        const listNow = false;
        const packedData = await createBatchMintData({
          hre,
          listNow,
        });
        await expect(
          removal.mintBatch(
            namedAccounts.supplier,
            removalBalances,
            tokenIds,
            packedData
          )
        )
          .to.emit(removal, 'TransferBatch')
          .withArgs(
            namedAccounts.admin,
            AddressZero,
            namedAccounts.supplier,
            tokenIds,
            removalBalances
          )
          .to.emit(rNori, 'ScheduleCreated')
          .withArgs(
            packedData.projectId,
            packedData.scheduleStartTime,
            BigNumber.from(packedData.scheduleStartTime).add(
              SECONDS_IN_10_YEARS
            )
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
    describe('error', () => {
      describe('TokenIdExists', () => {
        it('should not mint a removal with a duplicate token id', async () => {
          const { removal, hre } = await setupTest();
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
          const packedData = await createBatchMintData({
            hre,
            listNow: false,
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
});
