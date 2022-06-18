import { BigNumber } from 'ethers';

import { expect, advanceTime, setupTest, NOW } from '@/test/helpers';
import {
  restrictRemovalProceeds,
  compareScheduleSummaryStructs,
  compareScheduleDetailForAddressStructs,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
  mintAndListRemovals,
} from '@/test/helpers/restricted-nori';

describe('RestrictedNORI revocation', () => {
  describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
    describe('success', () => {
      it('should revoke a specific number of tokens, emit events, and account for the quantity revoked - single account', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await mintAndListRemovals({
            testSetup,
            removalDataToList,
          });
        const { supplier, admin } = hre.namedAccounts;

        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });

        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(projectId);
        expect(originalRevocableQuantity).to.equal(restrictedAmount / 2);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(rNori, 'TokensRevoked')
          .withArgs(
            scheduleStartTime + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            projectId,
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

        expect(await rNori.revocableQuantityForSchedule(projectId)).to.equal(0);
        const newBalance = BigNumber.from(restrictedAmount).sub(
          originalRevocableQuantity
        );
        const restrictionScheduleSummary = await rNori.getScheduleSummary(
          projectId
        );
        expect(restrictionScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(restrictionScheduleSummary.totalSupply).to.equal(newBalance);
        expect(await rNori.balanceOf(supplier, projectId)).to.equal(newBalance);
        expect(await rNori.totalSupply(projectId)).to.equal(newBalance);
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(restrictedAmount).sub(originalRevocableQuantity)
          )
        );
      });
      it('should revoke tokens correctly when there are multiple token holders for a schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await mintAndListRemovals({
            testSetup,
            removalDataToList,
          });
        const { supplier, admin, investor1 } = hre.namedAccounts;

        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });

        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });
        const amountToTransferToInvestor = 310;
        await rNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            projectId,
            amountToTransferToInvestor,
            '0x'
          );
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(projectId);
        expect(originalRevocableQuantity).to.equal(restrictedAmount / 2);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [originalRevocableQuantity]
          )
        )
          .to.emit(rNori, 'TokensRevoked')
          .withArgs(
            scheduleStartTime + SECONDS_IN_5_YEARS,
            listedRemovalIds[0],
            projectId,
            originalRevocableQuantity
          );

        const expectedRevokedFromSupplier =
          (restrictedAmount - amountToTransferToInvestor) / 2; // 345
        const expectedRevokedFromInvestor = amountToTransferToInvestor / 2; // 155

        const supplierRestrictionScheduleDetail =
          await rNori.getScheduleDetailForAccount(supplier, projectId);
        const investorRestrictionScheduleDetail =
          await rNori.getScheduleDetailForAccount(investor1, projectId);
        const scheduleSummary = await rNori.getScheduleSummary(projectId);
        const revocableQuantityForScheduleAfterRevocation =
          await rNori.revocableQuantityForSchedule(projectId);

        expect(supplierRestrictionScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromSupplier
        );
        expect(investorRestrictionScheduleDetail.quantityRevoked).to.equal(
          expectedRevokedFromInvestor
        );
        expect(supplierRestrictionScheduleDetail.balance).to.equal(
          restrictedAmount -
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
          BigNumber.from(restrictedAmount).sub(originalRevocableQuantity)
        );
        expect(revocableQuantityForScheduleAfterRevocation).to.equal(0);

        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(restrictedAmount).sub(originalRevocableQuantity)
          )
        );
      });

      // eslint-disable-next-line jest/expect-expect -- assertions in comparison utilities
      it('can revoke tokens correctly when there are multiple token holders and some tokens have already been claimed', async () => {
        const removalDataToList = [
          {
            amount: 3000,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await mintAndListRemovals({
            testSetup,
            removalDataToList,
          });
        const { supplier, admin, investor1, employee } = hre.namedAccounts;

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });
        await Promise.all([
          rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(supplier, investor1, projectId, 1000, '0x'),
          rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(supplier, employee, projectId, 1000, '0x'),
        ]);

        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });

        const amountToClaimForSupplier = 500;
        await rNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromSchedule(supplier, projectId, amountToClaimForSupplier);

        const revocableQuantityForSchedule =
          await rNori.revocableQuantityForSchedule(projectId);

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
          rNori.getScheduleSummary(projectId),
          rNori.getScheduleDetailForAccount(supplier, projectId),
          rNori.getScheduleDetailForAccount(investor1, projectId),
          rNori.getScheduleDetailForAccount(employee, projectId),
        ]);
        compareScheduleSummaryStructs(scheduleSummaryAfterRevocation, {
          totalQuantityRevoked: revocableQuantityForSchedule,
          totalSupply: BigNumber.from(restrictedAmount)
            .sub(revocableQuantityForSchedule)
            .sub(amountToClaimForSupplier),
        });
        compareScheduleDetailForAddressStructs(supplierScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 0,
          claimableAmount: 0,
          claimedAmount: 500,
        });
        compareScheduleDetailForAddressStructs(investorScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 500,
          claimableAmount: 500,
          claimedAmount: 0,
        });
        compareScheduleDetailForAddressStructs(employeeScheduleDetail, {
          quantityRevoked: revocableQuantityForSchedule.div(3),
          balance: 500,
          claimableAmount: 500,
          claimedAmount: 0,
        });
      });
      it('should revoke all revocable tokens when an amount of 0 is passed', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await mintAndListRemovals({
            testSetup,
            removalDataToList,
          });
        const { supplier, admin } = hre.namedAccounts;
        const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });
        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });
        const originalRevocableQuantity =
          await rNori.revocableQuantityForSchedule(projectId);
        expect(originalRevocableQuantity).to.equal(restrictedAmount / 2);
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin],
            listedRemovalIds,
            [0]
          )
        )
          .to.emit(rNori, 'TokensRevoked')
          .withArgs(
            NOW,
            listedRemovalIds[0],
            projectId,
            originalRevocableQuantity
          );

        expect(await rNori.revocableQuantityForSchedule(projectId)).to.equal(0);
        const newBalance = BigNumber.from(restrictedAmount).sub(
          originalRevocableQuantity
        );
        const restrictionScheduleSummary = await rNori.getScheduleSummary(
          projectId
        );
        expect(restrictionScheduleSummary.totalQuantityRevoked).to.equal(
          originalRevocableQuantity
        );
        expect(restrictionScheduleSummary.totalSupply).to.equal(newBalance);
        expect(await rNori.balanceOf(supplier, projectId)).to.equal(newBalance);
        expect(await rNori.totalSupply(projectId)).to.equal(newBalance);
        expect(await bpNori.balanceOf(admin)).to.equal(
          originalAdminBpNoriBalance.sub(
            BigNumber.from(restrictedAmount).sub(originalRevocableQuantity)
          )
        );
      });
      it('can revoke for more than one removal at a time, and can revoke from the same schedule repeatedly', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
          {
            amount: 100,
            vintage: 2019,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, hre } = testSetup;
        const {
          listedRemovalIds: listedRemovalIds1,
          projectId: projectId1,
          scheduleStartTime,
        } = await mintAndListRemovals({
          testSetup,
          removalDataToList: [removalDataToList[0]],
        });
        const { listedRemovalIds: listedRemovalIds2, projectId: projectId2 } =
          await mintAndListRemovals({
            testSetup,
            projectId: 999_999_999,
            removalDataToList: [removalDataToList[1]],
          });
        const { admin } = hre.namedAccounts;
        const restrictedAmounts = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await restrictRemovalProceeds({
          testSetup,
          removalIds: [listedRemovalIds1[0], listedRemovalIds2[0]],
          removalAmountsToRestrict: restrictedAmounts,
        });
        const allScheduleIds = await rNori.getAllScheduleIds();
        expect(
          allScheduleIds.map((scheduleId) => scheduleId.toHexString())
        ).to.have.deep.members([
          BigNumber.from(projectId1).toHexString(),
          BigNumber.from(projectId2).toHexString(),
        ]);
        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 1;
        expect(
          await rNori.batchRevokeUnreleasedTokenAmounts(
            [admin, admin],
            [listedRemovalIds1[0], listedRemovalIds2[0]],
            [quantityToRevoke, quantityToRevoke]
          )
        )
          .to.emit(rNori, 'TokensRevoked')
          .withArgs(
            scheduleStartTime + SECONDS_IN_5_YEARS,
            listedRemovalIds1[0],
            projectId1,
            quantityToRevoke
          )
          .to.emit(rNori, 'TokensRevoked')
          .withArgs(
            scheduleStartTime + SECONDS_IN_5_YEARS,
            listedRemovalIds2[0],
            projectId2,
            quantityToRevoke
          );
        const scheduleSummariesAfterFirstRevocation =
          await rNori.batchGetScheduleSummaries([projectId1, projectId2]);
        expect(scheduleSummariesAfterFirstRevocation.length).to.equal(2);
        for (let index = 0; index < 2; index += 1) {
          compareScheduleSummaryStructs(
            scheduleSummariesAfterFirstRevocation[index],
            {
              totalQuantityRevoked: quantityToRevoke,
              totalSupply: restrictedAmounts[index] - quantityToRevoke,
            }
          );
        }
        // revoke a second time
        await rNori.batchRevokeUnreleasedTokenAmounts(
          [admin, admin],
          [listedRemovalIds1[0], listedRemovalIds2[0]],
          [quantityToRevoke, quantityToRevoke]
        );
        const scheduleSummariesAfterSecondRevocation =
          await rNori.batchGetScheduleSummaries([projectId1, projectId2]);
        for (let index = 0; index < 2; index += 1) {
          compareScheduleSummaryStructs(
            scheduleSummariesAfterSecondRevocation[index],
            {
              totalQuantityRevoked: quantityToRevoke * 2,
              totalSupply: restrictedAmounts[index] - quantityToRevoke * 2,
            }
          );
        }
      });
      it('should maintain the correct released amount floor when tokens are revoked, and release correctly over the course of the schedule', async () => {
        const removalDataToList = [
          {
            amount: 1000,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTest({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await mintAndListRemovals({
            testSetup,
            removalDataToList,
          });
        const { admin } = hre.namedAccounts;

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });

        // at halfway through the schedule should have 500 released tokens, 500 claimable
        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
        });
        const quantityToRevoke = 250;
        await rNori.batchRevokeUnreleasedTokenAmounts(
          [admin],
          listedRemovalIds,
          [quantityToRevoke]
        );
        const scheduleSummary = await rNori.getScheduleSummary(projectId);
        // after revoking 250 tokens, the claimable amount shouldn't drop below the current level of 500
        expect(await rNori.revocableQuantityForSchedule(projectId)).to.equal(
          250
        );
        expect(scheduleSummary.totalClaimableAmount).to.equal(500);

        const expectedTimestampWhereReleasedAmountStartsIncreasingAgain =
          scheduleStartTime + Math.floor(SECONDS_IN_1_YEAR_AVG * 6.666_66);

        // at 2/3 through the schedule, the linear release amount will have caught up with the floor
        // and both should be 500
        await advanceTime({
          hre,
          timestamp: expectedTimestampWhereReleasedAmountStartsIncreasingAgain,
        });
        const scheduleSummaryAtTwoThirdsTimestamp =
          await rNori.getScheduleSummary(projectId);
        const revocableQuantityAtTwoThirdsTimestamp =
          await rNori.revocableQuantityForSchedule(projectId);
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
          await rNori.getScheduleSummary(projectId);
        const revocableQuantityAfterTwoThirdsTimestamp =
          await rNori.revocableQuantityForSchedule(projectId);
        expect(
          scheduleSummaryAfterTwoThirdsTimestamp.totalClaimableAmount.toNumber()
        ).to.be.greaterThan(500);
        expect(
          revocableQuantityAfterTwoThirdsTimestamp.toNumber()
        ).to.be.lessThan(250);

        // at the end of the 10 year schedule, all (unrevoked) tokens should be released
        await advanceTime({
          hre,
          timestamp: scheduleStartTime + SECONDS_IN_10_YEARS,
        });
        const scheduleSummaryAtEndOfSchedule = await rNori.getScheduleSummary(
          projectId
        );
        const revocableQuantityAtEndOfSchedule =
          await rNori.revocableQuantityForSchedule(projectId);
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
        const testSetup = await setupTest({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds } = await mintAndListRemovals({
          testSetup,
          removalDataToList,
        });
        const { buyer } = hre.namedAccounts;

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
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
        const testSetup = await setupTest({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId } = await mintAndListRemovals({
          testSetup,
          removalDataToList,
        });
        const { admin } = hre.namedAccounts;

        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          removalIds: listedRemovalIds,
          removalAmountsToRestrict: [restrictedAmount],
        });
        const revocableQuantityForSchedule =
          await rNori.revocableQuantityForSchedule(projectId);
        await expect(
          rNori.batchRevokeUnreleasedTokenAmounts([admin], listedRemovalIds, [
            revocableQuantityForSchedule.add(1),
          ])
        ).to.be.revertedWith(`InsufficientUnreleasedTokens(${projectId})`);
      });
    });
  });
});
