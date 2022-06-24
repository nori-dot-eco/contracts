import { BigNumber } from 'ethers';

import {
  expect,
  advanceTime,
  createRemovalTokenId,
  getLatestBlockTime,
  batchMintAndListRemovalsForSale,
  createBatchMintData,
} from '@/test/helpers';
import {
  setupTestLocal,
  restrictRemovalProceeds,
  formatTokensReceivedUserData,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
} from '@/test/helpers/restricted-nori';

describe('RestrictedNORI', () => {
  describe('initialization', () => {
    describe('roles', () => {
      for (const { role, expectedCount } of [
        { role: 'DEFAULT_ADMIN_ROLE', expectedCount: 1 },
        { role: 'PAUSER_ROLE', expectedCount: 1 },
        { role: 'SCHEDULE_CREATOR_ROLE', expectedCount: 2 }, // Market contract and admin are both schedule creators
        { role: 'TOKEN_REVOKER_ROLE', expectedCount: 1 },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { rNori, hre } = await setupTestLocal();
          expect(
            await rNori.hasRole(await rNori[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await rNori.getRoleAdmin(await rNori[role]())).to.eq(
            await rNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await rNori.getRoleMemberCount(await rNori[role]())).to.eq(
            expectedCount
          );
        });
      }
      for (const { role } of [
        { role: 'SCHEDULE_CREATOR_ROLE' },
        { role: 'TOKEN_DEPOSITOR_ROLE' },
      ] as const) {
        it(`will assign the role ${role} to the market contract`, async () => {
          const { rNori, fifoMarket } = await setupTestLocal();
          expect(await rNori.hasRole(await rNori[role](), fifoMarket.address))
            .to.be.true;
          expect(await rNori.getRoleAdmin(await rNori[role]())).to.eq(
            await rNori.DEFAULT_ADMIN_ROLE()
          );
        });
      }
    });
  });
  describe('pausing', () => {
    it('can be paused by the PAUSER_ROLE', async () => {
      const { rNori, hre } = await setupTestLocal();
      expect(
        await rNori.hasRole(
          await rNori['PAUSER_ROLE'](),
          hre.namedAccounts.admin
        )
      ).to.be.true;
      await rNori.pause();
      expect(await rNori.paused()).to.be.true;
    });
    it('can be unpaused by the PAUSER_ROLE', async () => {
      const { rNori, hre } = await setupTestLocal();
      expect(
        await rNori.hasRole(
          await rNori['PAUSER_ROLE'](),
          hre.namedAccounts.admin
        )
      ).to.be.true;
      await rNori.pause();
      expect(await rNori.paused()).to.be.true;
      await rNori.unpause();
      expect(await rNori.paused()).to.be.false;
    });

    it('can not be paused by an account that does not have the PAUSER_ROLE', async () => {
      const { rNori, hre } = await setupTestLocal();
      expect(
        await rNori.hasRole(
          await rNori['PAUSER_ROLE'](),
          hre.namedAccounts.buyer
        )
      ).to.be.false;
      await expect(rNori.connect(hre.namedSigners.buyer).pause()).to.be
        .reverted;
      expect(await rNori.paused()).to.be.false;
    });
  });
  describe('restriction duration map', () => {
    it('should be initialized to 10 years for a methodology of 1 and methodology version of 0', async () => {
      const { rNori } = await setupTestLocal({});
      const retrievedRestrictionDuration =
        await rNori.getRestrictionDurationForMethodologyAndVersion(1, 0);
      expect(retrievedRestrictionDuration.wasSet).to.equal(true);
      expect(retrievedRestrictionDuration.duration).to.equal(
        SECONDS_IN_10_YEARS
      );
    });
    it('should be able to set and get a new restriction duration for a given methodology and version', async () => {
      const { rNori } = await setupTestLocal({});
      const methodology = 2;
      const methodologyVersion = 0;
      const newDuration = SECONDS_IN_1_YEAR_AVG;
      const scheduleDurationBeforeSetting =
        await rNori.getRestrictionDurationForMethodologyAndVersion(
          methodology,
          methodologyVersion
        );
      expect(scheduleDurationBeforeSetting.wasSet).to.equal(false);
      expect(scheduleDurationBeforeSetting.duration).to.equal(0);
      await rNori.setRestrictionDurationForMethodologyAndVersion(
        methodology,
        methodologyVersion,
        newDuration
      );
      const scheduleDurationAfterSetting =
        await rNori.getRestrictionDurationForMethodologyAndVersion(
          methodology,
          methodologyVersion
        );
      expect(scheduleDurationAfterSetting.wasSet).to.equal(true);
      expect(scheduleDurationAfterSetting.duration).to.equal(
        SECONDS_IN_1_YEAR_AVG
      );
    });
    it('should revert if the transaction sender does not have the DEFAULT_ADMIN_ROLE', async () => {
      const { rNori } = await setupTestLocal({});
      const methodology = 2;
      const methodologyVersion = 0;
      const newDuration = SECONDS_IN_1_YEAR_AVG;
      await expect(
        rNori
          .connect(hre.namedSigners.buyer) // funded address without DEFAULT_ADMIN_ROLE
          .setRestrictionDurationForMethodologyAndVersion(
            methodology,
            methodologyVersion,
            newDuration
          )
      ).to.be.reverted;
    });
    it('should revert if a restriction schedule is being created for a methodology/version that does not have a duration set', async () => {
      const { removal, fifoMarket, hre } = await setupTestLocal({});
      const removalIdWithMethodology2 = await createRemovalTokenId({
        removal,
        removalData: { methodology: 2 },
        hre,
      });
      const projectId = 1_234_567_890;
      const scheduleStartTime = await getLatestBlockTime({ hre });
      const amount = 20_000_000;
      const packedData = await createBatchMintData({
        hre,
        fifoMarket,
        listNow: true,
        projectId,
        scheduleStartTime,
      });

      await expect(
        removal.mintBatch(
          hre.namedAccounts.supplier,
          [amount],
          [removalIdWithMethodology2],
          packedData
        )
      ).to.be.reverted;
      // ).to.be.revertedWith(`RestrictionDurationNotSet(${projectId})`);
    });
  });
  describe('tokensReceived', () => {
    it('should deposit tokens and automatically create a new restriction schedule where one does not exist', async () => {
      const removalDataToList = [
        {
          amount: 5,
          vintage: 2018,
        },
      ];
      const testSetup = await setupTestLocal({});
      const { bpNori, rNori } = testSetup;
      const { listedRemovalIds, projectId, scheduleStartTime } =
        await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList,
        });
      const { namedAccounts } = hre;
      const restrictedAmount = 1;
      const userData = formatTokensReceivedUserData(listedRemovalIds[0]);
      expect(await bpNori.send(rNori.address, restrictedAmount, userData))
        .to.emit(rNori, 'Minted')
        .withArgs(
          bpNori.address,
          namedAccounts.supplier,
          restrictedAmount,
          userData,
          '0x'
        )
        .to.emit(rNori, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          namedAccounts.supplier,
          restrictedAmount
        )
        .to.emit(bpNori, 'Sent')
        .withArgs(
          namedAccounts.admin,
          namedAccounts.admin,
          rNori.address,
          restrictedAmount,
          userData,
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(namedAccounts.admin, rNori.address, restrictedAmount);
      const restrictionScheduleDetail = await rNori.getScheduleSummary(
        projectId
      );
      expect(restrictionScheduleDetail.scheduleTokenId).equals(projectId);
      expect(restrictionScheduleDetail.totalSupply).equals(restrictedAmount);
      expect(restrictionScheduleDetail.tokenHolders[0]).equals(
        namedAccounts.supplier
      );
      expect(restrictionScheduleDetail.startTime).equals(scheduleStartTime);
      expect(restrictionScheduleDetail.endTime).equals(
        scheduleStartTime + SECONDS_IN_10_YEARS
      );
      expect(restrictionScheduleDetail.totalClaimedAmount).equals(0);
      expect(restrictionScheduleDetail.totalQuantityRevoked).equals(0);
      expect(restrictionScheduleDetail.exists).equals(true);
    });
    it('should revert if the sender of bpNori is not the market contract', async () => {
      const removalDataToList = [
        {
          amount: 5,
          vintage: 2018,
        },
      ];
      const testSetup = await setupTestLocal({});
      const { bpNori, rNori, hre } = testSetup;
      const { listedRemovalIds } = await batchMintAndListRemovalsForSale({
        testSetup,
        removalDataToList,
      });
      const restrictedAmount = 1;
      const userData = formatTokensReceivedUserData(listedRemovalIds[0]);
      await expect(
        bpNori
          .connect(hre.namedSigners.buyer)
          .send(rNori.address, restrictedAmount, userData)
      ).to.be.revertedWith(`InvalidBpNoriSender("${hre.namedAccounts.buyer}")`);
    });
  });
  describe('Linear releasing (claimableBalanceForSchedule)', () => {
    it('should return 0 before schedule start time', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2020,
        },
      ];
      const testSetup = await setupTestLocal({});
      const { rNori, hre } = testSetup;
      const { listedRemovalIds, projectId } =
        await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList,
        });
      const { supplier } = hre.namedAccounts;
      const removalAmountsToRestrict = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await restrictRemovalProceeds({
        testSetup,
        removalIds: listedRemovalIds,
        removalAmountsToRestrict,
      });
      const claimableBalanceForSchedule =
        await rNori.claimableBalanceForSchedule(projectId);
      expect(claimableBalanceForSchedule).to.equal(0);
      await expect(
        rNori
          .connect(hre.namedSigners.supplier)
          .withdrawFromSchedule(
            supplier,
            projectId,
            removalAmountsToRestrict[0]
          )
      ).revertedWith(
        `InsufficientClaimableBalance("${supplier}", ${projectId})`
      );
    });
    it('should return the full amount at the end of the restriction schedule', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
        },
      ];
      const testSetup = await setupTestLocal({});
      const { rNori, hre } = testSetup;
      const { listedRemovalIds, projectId, scheduleStartTime } =
        await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList,
        });
      const { supplier } = hre.namedAccounts;
      const restrictedAmount = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        removalIds: listedRemovalIds,
        removalAmountsToRestrict: [restrictedAmount],
      });
      await advanceTime({
        hre,
        timestamp: scheduleStartTime + SECONDS_IN_10_YEARS,
      });
      const claimableBalanceOf =
        await rNori.claimableBalanceForScheduleForAccount(projectId, supplier);
      expect(claimableBalanceOf).to.equal(restrictedAmount);
      await rNori
        .connect(await hre.ethers.getSigner(supplier))
        .withdrawFromSchedule(supplier, projectId, removalDataToList[0].amount);
    });
    it('should release linearly as expected and increase the current released amount when the total amount increases', async () => {
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
      const testSetup = await setupTestLocal({});
      const { rNori, hre } = testSetup;
      const { listedRemovalIds, projectId, scheduleStartTime } =
        await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList,
        });
      const firstAmountToRestrict = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        removalIds: [listedRemovalIds[0]],
        removalAmountsToRestrict: [firstAmountToRestrict],
      });
      await advanceTime({
        hre,
        timestamp: scheduleStartTime + SECONDS_IN_5_YEARS,
      });
      const originalClaimableBalanceForSchedule =
        await rNori.claimableBalanceForSchedule(projectId);
      expect(originalClaimableBalanceForSchedule).to.equal(
        removalDataToList[0].amount / 2
      );
      const secondAmountToRestrict = removalDataToList[1].amount;
      await restrictRemovalProceeds({
        testSetup,
        removalIds: [listedRemovalIds[1]],
        removalAmountsToRestrict: [secondAmountToRestrict],
      });
      const claimableBalanceAfterSecondRestriction =
        await rNori.claimableBalanceForSchedule(projectId);
      expect(claimableBalanceAfterSecondRestriction).to.equal(
        removalDataToList[0].amount / 2 + removalDataToList[1].amount / 2
      );
    });
  });
  describe('Claiming (withdrawTo)', () => {
    describe('success', () => {
      it('can withdraw claimable tokens', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
            testSetup,
            removalDataToList,
          });
        const { supplier } = hre.namedAccounts;
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

        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            projectId,
            supplier
          );
        expect(
          await rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromSchedule(supplier, projectId, claimableBalance)
        )
          .to.emit(rNori, 'TokensClaimed')
          .withArgs(supplier, supplier, projectId, claimableBalance);

        expect(await rNori.totalSupply(projectId)).to.equal(
          BigNumber.from(restrictedAmount).sub(claimableBalance)
        );
        expect(await rNori.balanceOf(supplier, projectId)).to.equal(
          BigNumber.from(restrictedAmount).sub(claimableBalance)
        );
        expect(
          await rNori.claimableBalanceForScheduleForAccount(projectId, supplier)
        ).to.equal(0);
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(claimableBalance);
      });
      it('provides the correct claimable quantity when some tokens have already been claimed', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
            testSetup,
            removalDataToList,
          });
        const { supplier } = hre.namedAccounts;
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

        const claimableBalanceAtHalfway =
          await rNori.claimableBalanceForScheduleForAccount(
            projectId,
            supplier
          );
        await rNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromSchedule(supplier, projectId, claimableBalanceAtHalfway);

        // advance to 3/4 of the way through schedule
        await advanceTime({
          hre,
          timestamp: scheduleStartTime + 7.5 * SECONDS_IN_1_YEAR_AVG,
        });

        const claimableBalanceAtThreeQuarters =
          await rNori.claimableBalanceForSchedule(projectId);
        expect(claimableBalanceAtThreeQuarters).to.equal(
          BigNumber.from(
            restrictedAmount * 0.75 - claimableBalanceAtHalfway.toNumber()
          )
        );
      });
      it('can withdraw to a different address from the restriction schedule holder', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
            testSetup,
            removalDataToList,
          });
        const { supplier, investor1 } = hre.namedAccounts;
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

        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            projectId,
            supplier
          );
        expect(
          await rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromSchedule(investor1, projectId, claimableBalance)
        )
          .to.emit(rNori, 'TokensClaimed')
          .withArgs(supplier, investor1, projectId, claimableBalance);

        expect(await rNori.totalSupply(projectId)).to.equal(
          BigNumber.from(restrictedAmount).sub(claimableBalance)
        );
        expect(await rNori.balanceOf(supplier, projectId)).to.equal(
          BigNumber.from(restrictedAmount).sub(claimableBalance)
        );
        expect(
          await rNori.claimableBalanceForScheduleForAccount(projectId, supplier)
        ).to.equal(0);
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(0);
        expect(await bpNori.balanceOf(investor1)).to.equal(claimableBalance);
      });
      it('can withdraw correctly from a restriction schedule with multiple token holders', async () => {
        const removalDataToList = [
          {
            amount: 3000,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
            testSetup,
            removalDataToList,
          });
        const { supplier, investor1, employee } = hre.namedAccounts;
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

        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const [
          supplierClaimableBalanceBeforeClaim,
          investorClaimableBalanceBeforeClaim,
          employeeClaimableBalanceBeforeClaim,
        ] = await Promise.all([
          rNori.claimableBalanceForScheduleForAccount(projectId, supplier),
          rNori.claimableBalanceForScheduleForAccount(projectId, investor1),
          rNori.claimableBalanceForScheduleForAccount(projectId, employee),
        ]);
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          restrictedAmount / 3 / 2
        );
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          restrictedAmount / 3 / 2
        );
        expect(employeeClaimableBalanceBeforeClaim).to.equal(
          restrictedAmount / 3 / 2
        );
        await rNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromSchedule(
            supplier,
            projectId,
            supplierClaimableBalanceBeforeClaim
          );
        const [
          supplierClaimableBalanceAfterClaim,
          investorClaimableBalanceAfterClaim,
          employeeClaimableBalanceAfterClaim,
        ] = await Promise.all([
          rNori.claimableBalanceForScheduleForAccount(projectId, supplier),
          rNori.claimableBalanceForScheduleForAccount(projectId, investor1),
          rNori.claimableBalanceForScheduleForAccount(projectId, employee),
        ]);

        expect(supplierClaimableBalanceAfterClaim).to.equal(0);

        expect(investorClaimableBalanceAfterClaim).to.equal(
          investorClaimableBalanceBeforeClaim
        );
        expect(employeeClaimableBalanceAfterClaim).to.equal(
          employeeClaimableBalanceBeforeClaim
        );

        expect(await rNori.totalSupply(projectId)).to.equal(
          BigNumber.from(restrictedAmount).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(await rNori.balanceOf(supplier, projectId)).to.equal(
          BigNumber.from(restrictedAmount / 3).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(await rNori.balanceOf(investor1, projectId)).to.equal(
          BigNumber.from(restrictedAmount / 3)
        );
        expect(await rNori.balanceOf(employee, projectId)).to.equal(
          BigNumber.from(restrictedAmount / 3)
        );
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(
          supplierClaimableBalanceBeforeClaim
        );
        expect(await bpNori.balanceOf(investor1)).to.equal(0);
        expect(await bpNori.balanceOf(employee)).to.equal(0);
      });
    });
    describe('failure', () => {
      it('should revert when attempting to withdraw more tokens than are available to claim', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
            testSetup,
            removalDataToList,
          });
        const { supplier } = hre.namedAccounts;
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

        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            projectId,
            supplier
          );
        const attemptToWithdrawAmount = claimableBalance.add(1);
        await expect(
          rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromSchedule(supplier, projectId, attemptToWithdrawAmount)
        ).to.be.revertedWith(
          `InsufficientClaimableBalance("${supplier}", ${projectId})`
        );
      });
    });
  });
});