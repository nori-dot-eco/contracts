import { BigNumber } from 'ethers';

import { defaultRemovalTokenIdFixture } from './fixtures/removal';

import { sum } from '@/utils/math';
import { SECONDS_IN_10_YEARS } from '@/test/helpers/restricted-nori';
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
              removals: [{ amount: 100 }],
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
      it('events parsing sandbox', async () => {
        const { removal, market, hre, removalTestHarness } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const { supplier, admin } = hre.namedAccounts;

        const mintRemovals = async (toAddress: string, optionalSupplierAddress: string | undefined = undefined) => {
          // allow us to pass in an optional supplier address, so we can mint
          // batches to the market but still have a supplier
          const supplierAddress = optionalSupplierAddress || toAddress;
          console.log({ supplierAddress });
          const defaultStartingVintage = 2016;
          const tokenIds = await Promise.all(
            removalBalances.map((_, index) => {
              return {
                ...defaultRemovalTokenIdFixture,
                supplierAddress,
                vintage: defaultStartingVintage + index,
                subIdentifier: Math.floor(Math.random() * 1000),
              };
            })
          );
          const data = await createBatchMintData({
            hre,
          });
          await removal.mintBatch(
            toAddress,
            removalBalances,
            tokenIds,
            data.projectId,
            data.scheduleStartTime,
            data.holdbackPercentage
          );
        };

        await mintRemovals(supplier);
        await mintRemovals(admin);
        await mintRemovals(market.address, supplier);
        await mintRemovals(market.address, admin);

        // todo try filtering on transaction hash instead of block hash
        const supplierFilter = removal.filters.TransferBatch(null, ethers.constants.AddressZero, supplier);
        const marketFilter = removal.filters.TransferBatch(null, ethers.constants.AddressZero, market.address);

        // todo use metamask in nori-admin and just pass the tx hash to nori-graphql to prevent halting nori-graphql on long transactions
        const supplierBatchTransferEvents = await removal.queryFilter(supplierFilter);
        const marketBatchTransferEvents = await removal.queryFilter(marketFilter);

        console.log({ supplierBatchTransferEvents });
        console.log({ marketBatchTransferEvents });
        console.log({ supplier });
        console.log({ marketAddress: market.address });

        const idsFromFirstSupplierEvent = supplierBatchTransferEvents[0].args.ids.map((id) =>
          id.toHexString()
        );
        const idsFromFirstMarketEvent = marketBatchTransferEvents[0].args.ids.map((id) =>
          id.toHexString()
        );
        const idsFromSecondMarketEvent = marketBatchTransferEvents[1].args.ids.map((id) =>
          id.toHexString()
        );
        console.log({ idsFromFirstSupplierEvent });
        console.log({ idsFromFirstMarketEvent });
        console.log({ idsFromSecondMarketEvent });

        /*
          Batch args[4] is args.values. Because the type is effectively Array & TransferBatchEventObject,
          the .values member has a naming collision with Array.prototype.values(), and is inaccessible.
        */
        const amountForSupplierBatches = supplierBatchTransferEvents.map((batch) => batch.args[4])
          .flat()
          .reduce((amount1, amount2) => amount1.add(amount2));

        // filter by supplier address
        const amountForMarketBatches = marketBatchTransferEvents.map((batch) => {
          const batchArgs = batch.args;
          const tokens = batchArgs.ids.map((id, index) => ({
            supplierAddress: '0x' + id.toHexString().substring(16, 56),
            amount: batchArgs[4][index],
          }));
          return tokens.filter((token) => token.supplierAddress.toLowerCase() === supplier.toLowerCase());
        }).flat()
          .map((token) => token.amount)
          .reduce((amount1, amount2) => amount1.add(amount2));

        const totalAmount = amountForSupplierBatches.add(amountForMarketBatches)
        const totalAsInt = parseInt(ethers.utils.formatEther(totalAmount));

        // each batch minted == 1000, one directly to the supplier, one to the market owned by supplier
        expect(totalAsInt).to.equal(2000);
      });
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
          removal.mintBatch(
            supplier,
            removalBalances,
            tokenIds,
            data.projectId,
            data.scheduleStartTime,
            data.holdbackPercentage
          )
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
      it('should mint and list a batch of removals in the same transaction and create restriction schedules', async () => {
        const { market, removal, removalTestHarness } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = sum(removalBalances);
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
          removal.mintBatch(
            market.address,
            removalBalances,
            tokenIds,
            data.projectId,
            data.scheduleStartTime,
            data.holdbackPercentage
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
      it('should list pre-minted removals for sale in the atomic marketplace and create restriction schedules', async () => {
        const { market, removal, rNori, removalTestHarness } =
          await setupTest();
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
            data.projectId,
            data.scheduleStartTime,
            data.holdbackPercentage
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
            data.projectId,
            data.scheduleStartTime,
            BigNumber.from(data.scheduleStartTime).add(SECONDS_IN_10_YEARS)
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
