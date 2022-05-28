import {
  createEscrowScheduleStartTimeArray,
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
        const tokenIds = await Promise.all(
          [2016, 2017, 2018, 2019].map((vintage) =>
            createRemovalTokenId(removal, { vintage })
          )
        );
        const escrowScheduleStartTimes =
          await createEscrowScheduleStartTimeArray(removal, tokenIds);
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
            escrowScheduleStartTimes,
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
          await fifoMarket.numberOfNrtsInQueueComputed();
        expect(marketTotalSupply).to.equal(
          formatTokenAmount(expectedMarketSupply).toString()
        );
      });
      it('should mint and list a batch of removals in the same transaction and create escrow schedules', async () => {
        const { fifoMarket, removal, eNori } = await setupTest();
        const removalBalances = [100, 200, 300, 400].map((balance) =>
          formatTokenAmount(balance)
        );
        const expectedMarketSupply = 1000;
        const tokenIds = await Promise.all(
          [2016, 2017, 2018, 2019].map((vintage) =>
            createRemovalTokenId(removal, { vintage })
          )
        );
        const escrowScheduleStartTimes =
          await createEscrowScheduleStartTimeArray(removal, tokenIds);
        const listNow = true;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await expect(
          removal.mintRemovalBatch(
            hre.namedAccounts.supplier,
            removalBalances,
            tokenIds,
            escrowScheduleStartTimes,
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
          )
          .to.emit(eNori, 'EscrowScheduleCreated')
          .withArgs(
            hre.namedAccounts.supplier,
            escrowScheduleStartTimes[0].toHexString()
          )
          .to.emit(eNori, 'EscrowScheduleCreated')
          .withArgs(
            hre.namedAccounts.supplier,
            escrowScheduleStartTimes[1].toHexString()
          )
          .to.emit(eNori, 'EscrowScheduleCreated')
          .withArgs(
            hre.namedAccounts.supplier,
            escrowScheduleStartTimes[2].toHexString()
          )
          .to.emit(eNori, 'EscrowScheduleCreated')
          .withArgs(
            hre.namedAccounts.supplier,
            escrowScheduleStartTimes[3].toHexString()
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
          await fifoMarket.numberOfNrtsInQueueComputed();
        expect(marketTotalSupply).to.equal(
          formatTokenAmount(expectedMarketSupply).toString()
        );
      });

      it('should list pre-minted removals for sale in the atomic marketplace', async () => {
        const { fifoMarket, removal } = await setupTest();
        const removalBalances = [100, 200, 300].map((balance) =>
          formatTokenAmount(balance)
        );
        const tokenIds = await Promise.all(
          [2016, 2017, 2018].map((vintage) =>
            createRemovalTokenId(removal, { vintage })
          )
        );
        const escrowScheduleStartTimes =
          await createEscrowScheduleStartTimeArray(removal, tokenIds);
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
            escrowScheduleStartTimes,
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
          // duplicate token id
          const tokenIds = await Promise.all(
            [2016, 2017, 2017].map((vintage) =>
              createRemovalTokenId(removal, { vintage })
            )
          );
          const escrowScheduleStartTimes =
            await createEscrowScheduleStartTimeArray(removal, tokenIds);
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
              escrowScheduleStartTimes,
              packedData
            )
          ).revertedWith('TokenIdExists');
        });
      });
    });
  });
  describe('getters', () => {
    describe('getEscrowScheduleStartTimeForRemoval', () => {
      it('should return the escrow schedule start time for a removal id', async () => {
        const { fifoMarket, removal, hre } = await setupTest();
        const removalBalances = [100].map((balance) =>
          formatTokenAmount(balance)
        );
        const tokenIds = await Promise.all(
          [2016].map((vintage) => createRemovalTokenId(removal, { vintage }))
        );
        const escrowScheduleStartTimes =
          await createEscrowScheduleStartTimeArray(removal, tokenIds);
        const listNow = false;
        const packedData = hre.ethers.utils.defaultAbiCoder.encode(
          ['address', 'bool'],
          [fifoMarket.address, listNow]
        );
        await removal.mintRemovalBatch(
          hre.namedAccounts.supplier,
          removalBalances,
          tokenIds,
          escrowScheduleStartTimes,
          packedData
        );
        const escrowScheduleStartTime =
          await removal.getEscrowScheduleIdForRemoval(tokenIds[0]);
        expect(escrowScheduleStartTime).to.equal(escrowScheduleStartTimes[0]);
      });
    });
  });
});
