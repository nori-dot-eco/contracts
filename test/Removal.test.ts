import {
  createRestrictionScheduleStartTimeArray,
  createRemovalTokenId,
  expect,
  setupTest,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('Removal', () => {
  describe('mintRemovalBatch', () => {
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
        const restrictionScheduleStartTimes =
          await createRestrictionScheduleStartTimeArray(removal, tokenIds);

        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintRemovalBatch(
            supplier,
            removalBalances,
            tokenIds,
            restrictionScheduleStartTimes,
            packedData
          )
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
        const restrictionScheduleStartTimes =
          await createRestrictionScheduleStartTimeArray(removal, tokenIds);

        const listNow = true;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintRemovalBatch(
            supplier,
            removalBalances,
            tokenIds,
            restrictionScheduleStartTimes,
            packedData
          )
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
        const restrictionScheduleStartTimes =
          await createRestrictionScheduleStartTimeArray(removal, tokenIds);
        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintRemovalBatch(
            hre.namedAccounts.supplier,
            removalBalances,
            tokenIds,
            restrictionScheduleStartTimes,
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

        // removal restriction schedule startTimes had to be set before we can call this and expect to get
        // the right restriction schedules
        const restrictionScheduleTokenIds = await Promise.all(
          tokenIds.map((removalId) => rNori.removalIdToScheduleId(removalId))
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
          .to.emit(rNori, 'RestrictionScheduleCreated')
          .withArgs(
            restrictionScheduleTokenIds[0].toHexString(),
            tokenIds[0].toHexString()
          )
          .to.emit(rNori, 'RestrictionScheduleCreated')
          .withArgs(
            restrictionScheduleTokenIds[1].toHexString(),
            tokenIds[1].toHexString()
          )
          .to.emit(rNori, 'RestrictionScheduleCreated')
          .withArgs(
            restrictionScheduleTokenIds[2].toHexString(),
            tokenIds[2].toHexString()
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
          const restrictionScheduleStartTimes =
            await createRestrictionScheduleStartTimeArray(removal, tokenIds);
          const listNow = false;
          const packedData = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'bool'],
            [fifoMarket.address, listNow]
          );
          await expect(
            removal.mintRemovalBatch(
              hre.namedAccounts.supplier,
              removalBalances,
              tokenIds,
              restrictionScheduleStartTimes,
              packedData
            )
          ).revertedWith('TokenIdExists');
        });
      });
    });
  });
  describe('getters', () => {
    describe('getRestrictionScheduleStartTimeForRemoval', () => {
      it('should return the restriction schedule start time for a removal id', async () => {
        const { fifoMarket, removal, hre } = await setupTest();
        const removalBalances = [100].map((balance) =>
          formatTokenAmount(balance)
        );
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
        const restrictionScheduleStartTimes =
          await createRestrictionScheduleStartTimeArray(removal, tokenIds);
        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await removal.mintRemovalBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          tokenIds,
          restrictionScheduleStartTimes,
          packedData
        );
        const restrictionScheduleStartTime =
          await removal.getRestrictionScheduleStartTimeForRemoval(tokenIds[0]);
        expect(restrictionScheduleStartTime).to.equal(
          restrictionScheduleStartTimes[0]
        );
      });
    });
  });
});
