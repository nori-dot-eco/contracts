import { BigNumber } from 'ethers';

import { expect, advanceTime } from '@/test/helpers';
import {
  setupTestRestrictedNORI,
  restrictRemovalProceeds,
  compareRestrictionScheduleSummaryStructs,
  compareRestrictionScheduleDetailForAddressStructs,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
  NOW,
} from '@/test/helpers/restricted-nori';

describe('RestrictedNORI revocation', () => {
  describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
    describe('success', () => {
      it('should revoke a specific number of tokens, emit events, and account for the quantity revoked - single account', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, bpNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { supplier, admin } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
        expect(originalRevocableQuantity).to.equal(amountToRestrict / 2);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(rNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            restrictionScheduleIds[0],
            originalRevocableQuantity
          )
          .to.emit(rNori, 'Burned')
          .withArgs(admin, supplier, originalRevocableQuantity, '0x', '0x')
          .to.emit(rNori, 'Transfer')
          .withArgs(
            supplier,
            hre.ethers.constants.AddressZero,
            originalRevocableQuantity
          )
          .to.emit(bpNori, 'Sent') // todo are these bpNori events actually getting emitted? are the args right? what happens if you put something blatantly wrong in here, does the test fail?
          .withArgs(
            rNori.address,
            rNori.address,
            admin,
            originalRevocableQuantity,
            '0x',
            '0x'
          )
          .to.emit(bpNori, 'Transfer')
          .withArgs(rNori.address, admin, originalRevocableQuantity);

        expect(
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0])
        ).to.equal(0);
        const newBalance = BigNumber.from(amountToRestrict).sub(
          originalRevocableQuantity
        );
        const restrictionScheduleSummary = await rNori.getRestrictionScheduleSummary(
          restrictionScheduleIds[0]
        );
        expect(restrictionScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(restrictionScheduleSummary.totalSupply).to.equal(newBalance);
        expect(
          await rNori.balanceOf(supplier, restrictionScheduleIds[0])
        ).to.equal(newBalance);
        expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToRestrict).sub(originalRevocableQuantity)
          )
        );
      });
      it('should revoke tokens correctly when there are multiple token holders for a schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, bpNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { supplier, admin, investor1 } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const amountToTransferToInvestor = 310;
        await rNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            restrictionScheduleIds[0],
            amountToTransferToInvestor,
            '0x'
          );
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
        expect(originalRevocableQuantity).to.equal(amountToRestrict / 2);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(rNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            restrictionScheduleIds[0],
            originalRevocableQuantity
          );

        const expectedRevokedFromSupplier =
          (amountToRestrict - amountToTransferToInvestor) / 2; // 345
        const expectedRevokedFromInvestor = amountToTransferToInvestor / 2; // 155

        const supplierRestrictionScheduleDetail =
          await rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          );
        const investorRestrictionScheduleDetail =
          await rNori.getRestrictionScheduleDetailForAccount(
            investor1,
            restrictionScheduleIds[0]
          );
        const scheduleSummary = await rNori.getRestrictionScheduleSummary(
          restrictionScheduleIds[0]
        );
        const revocableQuantityForScheduleAfterRevocation =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);

        expect(supplierRestrictionScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromSupplier
        );
        expect(investorRestrictionScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromInvestor
        );
        expect(supplierRestrictionScheduleDetail.balance).to.equal(
          amountToRestrict -
            amountToTransferToInvestor -
            expectedRevokedFromSupplier
        );
        expect(investorRestrictionScheduleDetail.balance).to.equal(
          amountToTransferToInvestor - expectedRevokedFromInvestor
        );
        expect(scheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(scheduleSummary.totalSupply).to.equal(
          BigNumber.from(amountToRestrict).sub(originalRevocableQuantity)
        );
        expect(revocableQuantityForScheduleAfterRevocation).to.equal(0);

        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToRestrict).sub(originalRevocableQuantity)
          )
        );
      });

      // eslint-disable-next-line jest/expect-expect -- assertions in comparison utilities
      it('can revoke tokens correctly when there are multiple token holders and some tokens have already been claimed', async () => {
        const removalDataToList = [
          {
            amount: 3000,
            vintage: 2018,
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });
        const { rNori, hre, restrictionScheduleIds, listedRemovalIds } =
          testSetup;
        const { supplier, investor1, employee, admin } = hre.namedAccounts;

        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        await Promise.all([
          rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(
              supplier,
              investor1,
              restrictionScheduleIds[0],
              1000,
              '0x'
            ),
          rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(
              supplier,
              employee,
              restrictionScheduleIds[0],
              1000,
              '0x'
            ),
        ]);

        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });

        const amountToClaimForSupplier = 500;
        await rNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromRestrictionSchedule(
            supplier,
            restrictionScheduleIds[0],
            amountToClaimForSupplier
          );

        const revocableQuantityForSchedule =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);

        await rNori.batchRevokeUnreleasedTokenAmounts(
          [admin],
          listedRemovalIds,
          [revocableQuantityForSchedule]
        );
        const [
          scheduleSummaryAfterRevocation,
          supplierScheduleDetail,
          investorScheduleDetail,
          employeeScheduleDetail,
        ] = await Promise.all([
          rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]),
          rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          ),
          rNori.getRestrictionScheduleDetailForAccount(
            investor1,
            restrictionScheduleIds[0]
          ),
          rNori.getRestrictionScheduleDetailForAccount(
            employee,
            restrictionScheduleIds[0]
          ),
        ]);
        compareRestrictionScheduleSummaryStructs(scheduleSummaryAfterRevocation, {
          totalQuantityRevoked: revocableQuantityForSchedule,
          totalSupply: BigNumber.from(amountToRestrict)
            .sub(revocableQuantityForSchedule)
            .sub(amountToClaimForSupplier),
        });
        compareRestrictionScheduleDetailForAddressStructs(supplierScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 0,
          claimableAmount: 0,
          claimedAmount: 500,
        });
        compareRestrictionScheduleDetailForAddressStructs(investorScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 500,
          claimableAmount: 500,
          claimedAmount: 0,
        });
        compareRestrictionScheduleDetailForAddressStructs(employeeScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 500,
          claimableAmount: 500,
          claimedAmount: 0,
        });

        console.log({
          revocableQuantityForSchedule,
          scheduleSummaryAfterRevocation,
          supplierScheduleDetail,
          investorScheduleDetail,
          employeeScheduleDetail,
        });
      });
      it('should revoke all revocable tokens when an amount of 0 is passed', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            restrictionScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, bpNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { supplier, admin } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        // await advanceTime({
        //   hre,
        //   timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        // });
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
        // expect(originalRevocableQuantity).to.equal(amountToRestrict / 2);
        expect(originalRevocableQuantity).to.equal(amountToRestrict);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [0]
          )
        )
          .to.emit(rNori, 'UnreleasedTokensRevoked')
          .withArgs(
            NOW,
            listedRemovalIds[0],
            restrictionScheduleIds[0],
            originalRevocableQuantity
          );

        expect(
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0])
        ).to.equal(0);
        const newBalance = BigNumber.from(amountToRestrict).sub(
          originalRevocableQuantity
        );
        const restrictionScheduleSummary = await rNori.getRestrictionScheduleSummary(
          restrictionScheduleIds[0]
        );
        expect(restrictionScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(restrictionScheduleSummary.totalSupply).to.equal(newBalance);
        expect(
          await rNori.balanceOf(supplier, restrictionScheduleIds[0])
        ).to.equal(newBalance);
        expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
          newBalance
        );
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(amountToRestrict).sub(originalRevocableQuantity)
          )
        );
      });
      it('can revoke for more than one removal at a time, and can revoke from the same schedule repeatedly', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
          {
            amount: 100,
            vintage: 2019,
            restrictionScheduleStartTime: UNIX_EPOCH_2019,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { admin } = hre.namedAccounts;
        const amountsToRestrict = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: amountsToRestrict,
        });
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 1;
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin, admin],
            listedRemovalIds,
            [quantityToRevoke, quantityToRevoke]
          )
        )
          .to.emit(rNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            restrictionScheduleIds[0],
            quantityToRevoke
          )
          .to.emit(rNori, 'UnreleasedTokensRevoked')
          .withArgs(
            UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
            listedRemovalIds[1],
            restrictionScheduleIds[1],
            quantityToRevoke
          );
        const scheduleSummariesAfterFirstRevocation =
          await rNori.batchGetRestrictionScheduleSummaries(restrictionScheduleIds);
        expect(scheduleSummariesAfterFirstRevocation.length).to.equal(
          restrictionScheduleIds.length
        );
        for (let index = 0; index < restrictionScheduleIds.length; index += 1) {
          expect(
            scheduleSummariesAfterFirstRevocation[index].totalQuantityRevoked
          ).to.equal(quantityToRevoke);
          expect(
            scheduleSummariesAfterFirstRevocation[index].totalSupply
          ).to.equal(amountsToRestrict[index] - quantityToRevoke);
        }
        // revoke a second time
        await rNori.batchRevokeUnreleasedTokenAmounts(
          [admin, admin],
          listedRemovalIds,
          [quantityToRevoke, quantityToRevoke]
        );
        const scheduleSummariesAfterSecondRevocation =
          await rNori.batchGetRestrictionScheduleSummaries(restrictionScheduleIds);
        for (let index = 0; index < restrictionScheduleIds.length; index += 1) {
          expect(
            scheduleSummariesAfterSecondRevocation[index].totalQuantityRevoked
          ).to.equal(quantityToRevoke * 2);
          expect(
            scheduleSummariesAfterSecondRevocation[index].totalSupply
          ).to.equal(amountsToRestrict[index] - quantityToRevoke * 2);
        }
      });
      it('should maintain the correct released amount floor when tokens are revoked, and release correctly over the course of the schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { admin } = hre.namedAccounts;
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });

        // at halfway through the schedule should have 500 released tokens, 500 claimable
        await advanceTime({
          hre,
          timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 250;
        await rNori.batchRevokeUnreleasedTokenAmounts(
          [admin],
          listedRemovalIds,
          [quantityToRevoke]
        );
        const scheduleSummary = await rNori.getRestrictionScheduleSummary(
          restrictionScheduleIds[0]
        );
        // after revoking 250 tokens, the claimable amount shouldn't drop below the current level of 500
        expect(
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0])
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
          await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);
        const revocableQuantityAtTwoThirdsTimestamp =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
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
          await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);
        const revocableQuantityAfterTwoThirdsTimestamp =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
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
          await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);
        const revocableQuantityAtEndOfSchedule =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
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
            restrictionScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, hre, listedRemovalIds } = testSetup;
        const { buyer } = hre.namedAccounts;
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        await expect(
          rNori
            .connect(hre.namedSigners.buyer) // missing TOKEN_REVOKE_ROLE (but funded)
            .batchRevokeUnreleasedTokenAmounts([buyer], listedRemovalIds, [1])
        ).to.be.reverted;
      });
      it('should revert when attempting to revoke more tokens than are revocable', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            restrictionScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });

        const { rNori, hre, listedRemovalIds, restrictionScheduleIds } =
          testSetup;
        const { admin } = hre.namedAccounts;
        const amountToRestrict = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [amountToRestrict],
        });
        const revocableQuantityForSchedule =
          await rNori.revocableQuantityForSchedule(restrictionScheduleIds[0]);
        await expect(
          rNori.batchRevokeUnreleasedTokenAmounts([admin], listedRemovalIds, [
            revocableQuantityForSchedule.add(1),
          ])
        ).to.be.revertedWith(
          `InsufficientUnreleasedTokens(${restrictionScheduleIds[0]})`
        );
      });
    });
  });
});
