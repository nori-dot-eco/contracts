import { BigNumber } from 'ethers';

import { expect, advanceTime } from '@/test/helpers';
import {
  setupTestEscrowedNORI,
  sendRemovalProceedsToEscrow,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
  NOW,
} from '@/test/helpers/escrowed-nori';

describe('EscrowedNORI revocation', () => {
  describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
    describe('success', () => {
      it('should revoke a specific number of tokens, emit events, and account for the quantity revoked - single account', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, bpNori, hre, listedRemovalIds, escrowScheduleIds } =
          testSetup;
        const { supplier, admin } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const originalRevocableQuantity =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        expect(originalRevocableQuantity).to.equal(amountToEscrow / 2);
        expect(
          await eNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(eNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            escrowScheduleIds[0],
            originalRevocableQuantity
          )
          .to.emit(eNori, 'Burned')
          .withArgs(admin, supplier, originalRevocableQuantity, '0x', '0x')
          .to.emit(eNori, 'Transfer')
          .withArgs(
            supplier,
            hre.ethers.constants.AddressZero,
            originalRevocableQuantity
          )
          .to.emit(bpNori, 'Sent') // todo are these bpNori events actually getting emitted? are the args right? what happens if you put something blatantly wrong in here, does the test fail?
          .withArgs(
            eNori.address,
            eNori.address,
            admin,
            originalRevocableQuantity,
            '0x',
            '0x'
          )
          .to.emit(bpNori, 'Transfer')
          .withArgs(eNori.address, admin, originalRevocableQuantity);

        expect(
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0])
        ).to.equal(0);
        const newBalance = BigNumber.from(amountToEscrow).sub(
          originalRevocableQuantity
        );
        const escrowScheduleSummary = await eNori.getEscrowScheduleSummary(
          escrowScheduleIds[0]
        );
        expect(escrowScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(escrowScheduleSummary.totalSupply).to.equal(newBalance);
        expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToEscrow).sub(originalRevocableQuantity)
          )
        );
      });
      it('should revoke tokens correctly when there are multiple token holders for a schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, bpNori, hre, listedRemovalIds, escrowScheduleIds } =
          testSetup;
        const { supplier, admin, investor1 } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const amountToTransferToInvestor = 310;
        await eNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            escrowScheduleIds[0],
            amountToTransferToInvestor,
            '0x'
          );
        const originalRevocableQuantity =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        expect(originalRevocableQuantity).to.equal(amountToEscrow / 2);
        expect(
          await eNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(eNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            escrowScheduleIds[0],
            originalRevocableQuantity
          );

        const expectedRevokedFromSupplier =
          (amountToEscrow - amountToTransferToInvestor) / 2; // 345
        const expectedRevokedFromInvestor = amountToTransferToInvestor / 2; // 155

        const supplierEscrowScheduleDetail =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );
        const investorEscrowScheduleDetail =
          await eNori.getEscrowScheduleDetailForAccount(
            investor1,
            escrowScheduleIds[0]
          );
        const scheduleSummary = await eNori.getEscrowScheduleSummary(
          escrowScheduleIds[0]
        );
        const revocableQuantityForScheduleAfterRevocation =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);

        expect(supplierEscrowScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromSupplier
        );
        expect(investorEscrowScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromInvestor
        );
        expect(supplierEscrowScheduleDetail.balance).to.equal(
          amountToEscrow -
            amountToTransferToInvestor -
            expectedRevokedFromSupplier
        );
        expect(investorEscrowScheduleDetail.balance).to.equal(
          amountToTransferToInvestor - expectedRevokedFromInvestor
        );
        expect(scheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(scheduleSummary.totalSupply).to.equal(
          BigNumber.from(amountToEscrow).sub(originalRevocableQuantity)
        );
        expect(revocableQuantityForScheduleAfterRevocation).to.equal(0);

        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToEscrow).sub(originalRevocableQuantity)
          )
        );
      });
      it('should revoke all revocable tokens when an amount of 0 is passed', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            escrowScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, bpNori, hre, listedRemovalIds, escrowScheduleIds } =
          testSetup;
        const { supplier, admin } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        // await advanceTime({
        //   hre,
        //   timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        // });
        const originalRevocableQuantity =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        // expect(originalRevocableQuantity).to.equal(amountToEscrow / 2);
        expect(originalRevocableQuantity).to.equal(amountToEscrow);
        expect(
          await eNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [0]
          )
        )
          .to.emit(eNori, 'UnreleasedTokensRevoked')
          .withArgs(
            NOW,
            listedRemovalIds[0],
            escrowScheduleIds[0],
            originalRevocableQuantity
          );

        expect(
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0])
        ).to.equal(0);
        const newBalance = BigNumber.from(amountToEscrow).sub(
          originalRevocableQuantity
        );
        const escrowScheduleSummary = await eNori.getEscrowScheduleSummary(
          escrowScheduleIds[0]
        );
        console.log({ escrowScheduleSummary });
        const supplierScheduleIds = await eNori.getScheduleIdsForAccount(
          supplier
        );
        console.log({ supplierScheduleIds });
        const supplierScheduleDetail =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );
        console.log({ supplierScheduleDetail });
        expect(escrowScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(escrowScheduleSummary.totalSupply).to.equal(newBalance);
        expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToEscrow).sub(originalRevocableQuantity)
          )
        );
      });
      it('can revoke for more than one removal at a time, and can revoke from the same schedule repeatedly', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
          {
            amount: 100,
            vintage: 2019,
            escrowScheduleStartTime: UNIX_EPOCH_2019,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, hre, listedRemovalIds, escrowScheduleIds } = testSetup;
        const { admin } = hre.namedAccounts;
        const amountsToEscrow = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: amountsToEscrow,
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 1;
        expect(
          await eNori.batchRevokeUnreleasedTokenAmounts(
            [admin, admin],
            listedRemovalIds,
            [quantityToRevoke, quantityToRevoke]
          )
        )
          .to.emit(eNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            escrowScheduleIds[0],
            quantityToRevoke
          )
          .to.emit(eNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[1],
            escrowScheduleIds[1],
            quantityToRevoke
          );
        const scheduleSummariesAfterFirstRevocation =
          await eNori.batchGetEscrowScheduleSummaries(escrowScheduleIds);
        expect(scheduleSummariesAfterFirstRevocation.length).to.equal(
          escrowScheduleIds.length
        );
        for (let index = 0; index < escrowScheduleIds.length; index += 1) {
          expect(
            scheduleSummariesAfterFirstRevocation[index].totalQuantityRevoked
          ).to.equal(quantityToRevoke);
          expect(
            scheduleSummariesAfterFirstRevocation[index].totalSupply
          ).to.equal(amountsToEscrow[index] - quantityToRevoke);
        }
        // revoke a second time
        await eNori.batchRevokeUnreleasedTokenAmounts(
          [admin, admin],
          listedRemovalIds,
          [quantityToRevoke, quantityToRevoke]
        );
        const scheduleSummariesAfterSecondRevocation =
          await eNori.batchGetEscrowScheduleSummaries(escrowScheduleIds);
        for (let index = 0; index < escrowScheduleIds.length; index += 1) {
          expect(
            scheduleSummariesAfterSecondRevocation[index].totalQuantityRevoked
          ).to.equal(quantityToRevoke * 2);
          expect(
            scheduleSummariesAfterSecondRevocation[index].totalSupply
          ).to.equal(amountsToEscrow[index] - quantityToRevoke * 2);
        }
      });
      it('should maintain the correct released amount floor when tokens are revoked, and release correctly over the course of the schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, hre, listedRemovalIds, escrowScheduleIds } = testSetup;
        const { admin } = hre.namedAccounts;
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });

        // at halfway through the schedule should have 500 released tokens, 500 claimable
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 250;
        await eNori.batchRevokeUnreleasedTokenAmounts(
          [admin],
          listedRemovalIds,
          [quantityToRevoke]
        );
        const scheduleSummary = await eNori.getEscrowScheduleSummary(
          escrowScheduleIds[0]
        );
        // after revoking 250 tokens, the claimable amount shouldn't drop below the current level of 500
        expect(
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0])
        ).to.equal(250);
        expect(scheduleSummary.totalClaimableAmount).to.equal(500);

        const expectedTimestampWhereReleasedAmountStartsIncreasingAgain =
          UNIX_EPOCH_2018 + Math.floor(SECONDS_IN_1_YEAR_AVG * 6.666_66);

        // at 2/3 through the schedule, the linear release amount will have caught up with the floor
        // and both should be 500
        await advanceTime({
          hre,
          timestamp: expectedTimestampWhereReleasedAmountStartsIncreasingAgain,
        });
        const scheduleSummaryAtTwoThirdsTimestamp =
          await eNori.getEscrowScheduleSummary(escrowScheduleIds[0]);
        const revocableQuantityAtTwoThirdsTimestamp =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        expect(
          scheduleSummaryAtTwoThirdsTimestamp.totalClaimableAmount
        ).to.equal(500);
        expect(revocableQuantityAtTwoThirdsTimestamp).to.equal(250);

        // after this equivalent point, the linear release amount should overtake the floor
        await advanceTime({
          hre,
          timestamp:
            expectedTimestampWhereReleasedAmountStartsIncreasingAgain +
            SECONDS_IN_1_YEAR_AVG,
        });
        const scheduleSummaryAfterTwoThirdsTimestamp =
          await eNori.getEscrowScheduleSummary(escrowScheduleIds[0]);
        const revocableQuantityAfterTwoThirdsTimestamp =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        expect(
          scheduleSummaryAfterTwoThirdsTimestamp.totalClaimableAmount.toNumber()
        ).to.be.greaterThan(500);
        expect(
          revocableQuantityAfterTwoThirdsTimestamp.toNumber()
        ).to.be.lessThan(250);

        // at the end of the 10 year schedule, all (unrevoked) tokens should be released
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_10_YEARS,
        });
        const scheduleSummaryAtEndOfSchedule =
          await eNori.getEscrowScheduleSummary(escrowScheduleIds[0]);
        const revocableQuantityAtEndOfSchedule =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        expect(scheduleSummaryAtEndOfSchedule.totalClaimableAmount).to.equal(
          750
        );
        expect(revocableQuantityAtEndOfSchedule).to.equal(0);
      });
    });
    describe('failure', () => {
      it('should revert when the account attempting to revoke is missing the TOKEN_REVOKER_ROLE', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            escrowScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, hre, listedRemovalIds } = testSetup;
        const { buyer } = hre.namedAccounts;
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        await expect(
          eNori
            .connect(hre.namedSigners.buyer) // missing TOKEN_REVOKE_ROLE (but funded)
            .batchRevokeUnreleasedTokenAmounts([buyer], listedRemovalIds, [1])
        ).to.be.reverted;
      });
      it('should revert when attempting to revoke more tokens than are revocable', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            escrowScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });

        const { eNori, hre, listedRemovalIds, escrowScheduleIds } = testSetup;
        const { admin } = hre.namedAccounts;
        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        const revocableQuantityForSchedule =
          await eNori.revocableQuantityForSchedule(escrowScheduleIds[0]);
        await expect(
          eNori.batchRevokeUnreleasedTokenAmounts([admin], listedRemovalIds, [
            revocableQuantityForSchedule.add(1),
          ])
        ).to.be.revertedWith(
          `InsufficientUnreleasedTokens(${escrowScheduleIds[0]})`
        );
      });
    });
  });
});
