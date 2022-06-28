import { BigNumber } from 'ethers';

import { formatTokenString } from '../utils/units';

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
  compareScheduleDetailForAddressStructs,
  compareScheduleSummaryStructs,
} from '@/test/helpers/restricted-nori';

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "compareScheduleDetailForAddressStructs", "compareScheduleSummaryStructs"] }] -- have ticket to fix expect statements in these utilities */
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
      expect(retrievedRestrictionDuration).to.equal(SECONDS_IN_10_YEARS);
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
      expect(scheduleDurationBeforeSetting).to.equal(0);
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
      expect(scheduleDurationAfterSetting).to.equal(SECONDS_IN_1_YEAR_AVG);
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
      ).to.be.revertedWith('Restriction duration not set');
    });
  });
  describe(`create schedule`, () => {
    it('should create a schedule with a direct call', async () => {
      const removalDataToList = [
        {
          amount: 5,
          vintage: 2018,
        },
      ];
      const testSetup = await setupTestLocal({});
      // mint removals but don't list yet (or a schedule will be created via listing)
      const { removal, fifoMarket, rNori, hre } = testSetup;
      const { projectId, scheduleStartTime } = {
        projectId: 1_234_567_890,
        scheduleStartTime: await getLatestBlockTime({ hre }),
      };
      const { supplier } = hre.namedAccounts;

      const removalTokenId = await createRemovalTokenId({
        removal,
        hre,
        removalData: {
          supplierAddress: supplier,
          vintage: 2016,
          subIdentifier: 9_999_999,
        },
      });

      const removalAmounts = removalDataToList.map((removalData) =>
        formatTokenString(removalData.amount.toString())
      );
      await removal.mintBatch(
        supplier,
        removalAmounts,
        [removalTokenId],
        await createBatchMintData({
          hre,
          fifoMarket,
          listNow: false,
          projectId,
          scheduleStartTime,
        })
      );
      await rNori.createSchedule(projectId);
      const scheduleSummary = await rNori.getScheduleSummary(projectId);
      expect(scheduleSummary.scheduleTokenId).to.equal(projectId);
      expect(scheduleSummary.startTime).to.equal(scheduleStartTime);
      expect(scheduleSummary.endTime).to.equal(
        scheduleStartTime + SECONDS_IN_10_YEARS
      );
      expect(scheduleSummary.tokenHolders).to.be.empty;
      expect(scheduleSummary.totalSupply).to.equal(0);
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
      const scheduleSummary = await rNori.getScheduleSummary(projectId);
      expect(scheduleSummary.scheduleTokenId).equals(projectId);
      expect(scheduleSummary.totalSupply).equals(restrictedAmount);
      expect(scheduleSummary.tokenHolders[0]).equals(namedAccounts.supplier);
      expect(scheduleSummary.startTime).equals(scheduleStartTime);
      expect(scheduleSummary.endTime).equals(
        scheduleStartTime + SECONDS_IN_10_YEARS
      );
      expect(scheduleSummary.totalClaimedAmount).equals(0);
      expect(scheduleSummary.totalQuantityRevoked).equals(0);
      expect(scheduleSummary.exists).equals(true);
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
  describe('Transferring (safeTransferFrom, batchSafeTransferFrom)', () => {
    describe('success', () => {
      describe('safeTransferFrom', () => {
        it('should transfer some tokens to another account', async () => {
          const removalDataToList = [
            {
              amount: 100,
              vintage: 2018,
            },
          ];
          const testSetup = await setupTestLocal({});
          const { rNori, hre } = testSetup;
          const { listedRemovalIds, projectId } =
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
          const supplierScheduleDetailBeforeTransfer =
            await rNori.getScheduleDetailForAccount(supplier, projectId);

          const expectedScheduleDetailBeforeTransfer = {
            tokenHolder: supplier,
            scheduleTokenId: projectId,
            balance: BigNumber.from(restrictedAmount),
            claimableAmount: BigNumber.from(0),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          };
          compareScheduleDetailForAddressStructs(
            supplierScheduleDetailBeforeTransfer,
            expectedScheduleDetailBeforeTransfer
          );
          await rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(supplier, investor1, projectId, 50, '0x');
          const supplierScheduleDetailAfterTransfer =
            await rNori.getScheduleDetailForAccount(supplier, projectId);
          const investor1ScheduleDetailAfterTransfer =
            await rNori.getScheduleDetailForAccount(investor1, projectId);

          const expectedSupplierScheduleDetailAfterTransfer = {
            tokenHolder: supplier,
            scheduleTokenId: projectId,
            balance: BigNumber.from(restrictedAmount / 2),
            claimableAmount: BigNumber.from(0),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          };
          const expectedInvestor1ScheduleDetailAfterTransfer = {
            tokenHolder: investor1,
            scheduleTokenId: projectId,
            balance: BigNumber.from(restrictedAmount / 2),
            claimableAmount: BigNumber.from(0),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          };
          compareScheduleDetailForAddressStructs(
            supplierScheduleDetailAfterTransfer,
            expectedSupplierScheduleDetailAfterTransfer
          );
          compareScheduleDetailForAddressStructs(
            investor1ScheduleDetailAfterTransfer,
            expectedInvestor1ScheduleDetailAfterTransfer
          );
        });

        it('should transfer all tokens to another account, resulting holder sets should be correct', async () => {
          const removalDataToList = [
            {
              amount: 100,
              vintage: 2018,
            },
          ];
          const testSetup = await setupTestLocal({});
          const { rNori, hre } = testSetup;
          const { listedRemovalIds, projectId } =
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
          const supplierScheduleDetailBeforeTransfer =
            await rNori.getScheduleDetailForAccount(supplier, projectId);
          compareScheduleDetailForAddressStructs(
            supplierScheduleDetailBeforeTransfer,
            {
              balance: BigNumber.from(restrictedAmount),
            }
          );
          const scheduleSummaryBeforeTransfer = await rNori.getScheduleSummary(
            projectId
          );
          compareScheduleSummaryStructs(scheduleSummaryBeforeTransfer, {
            tokenHolders: [supplier],
          });
          await rNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(
              supplier,
              investor1,
              projectId,
              restrictedAmount,
              '0x'
            );
          const supplierScheduleDetailAfterTransfer =
            await rNori.getScheduleDetailForAccount(supplier, projectId);
          const investor1ScheduleDetailAfterTransfer =
            await rNori.getScheduleDetailForAccount(investor1, projectId);
          const scheduleSummaryAfterTransfer = await rNori.getScheduleSummary(
            projectId
          );

          const expectedSupplierScheduleDetailAfterTransfer = {
            tokenHolder: supplier,
            balance: BigNumber.from(0),
            claimableAmount: BigNumber.from(0),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          };
          const expectedInvestor1ScheduleDetailAfterTransfer = {
            tokenHolder: investor1,
            balance: BigNumber.from(restrictedAmount),
            claimableAmount: BigNumber.from(0),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          };
          compareScheduleDetailForAddressStructs(
            supplierScheduleDetailAfterTransfer,
            expectedSupplierScheduleDetailAfterTransfer
          );
          compareScheduleDetailForAddressStructs(
            investor1ScheduleDetailAfterTransfer,
            expectedInvestor1ScheduleDetailAfterTransfer
          );
          compareScheduleSummaryStructs(scheduleSummaryAfterTransfer, {
            tokenHolders: [investor1],
          });
        });
      });
      describe('safeBatchTransferFrom', () => {
        it('should transfer some of multiple token types to another account', async () => {
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
          const { listedRemovalIds: listedRemovalIds1, projectId: projectId1 } =
            await batchMintAndListRemovalsForSale({
              testSetup,
              removalDataToList: [removalDataToList[0]],
            });
          const {
            listedRemovalIds: listedRemovalIds2,
            projectId: projectId2,
            scheduleStartTime: scheduleStartTime2,
          } = await batchMintAndListRemovalsForSale({
            testSetup,
            projectId: 999_999_999,
            removalDataToList: [removalDataToList[1]],
          });
          const { supplier, investor1 } = hre.namedAccounts;
          const restrictedAmounts = removalDataToList.map(
            (removalData) => removalData.amount
          );
          await restrictRemovalProceeds({
            testSetup,
            removalIds: [listedRemovalIds1[0], listedRemovalIds2[0]],
            removalAmountsToRestrict: restrictedAmounts,
          });
          // just to make the claimable balances easily computable
          await advanceTime({
            hre,
            timestamp: scheduleStartTime2 + SECONDS_IN_10_YEARS,
          });

          const supplierScheduleDetailsBeforeTransfer =
            await rNori.batchGetScheduleDetailsForAccount(supplier, [
              projectId1,
              projectId2,
            ]);

          const expectedScheduleDetailsBeforeTransfer = [
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(restrictedAmounts[0]),
              claimableAmount: BigNumber.from(restrictedAmounts[0]),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(restrictedAmounts[1]),
              claimableAmount: BigNumber.from(restrictedAmounts[1]),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
          ];
          for (const [
            index,
            scheduleDetail,
          ] of supplierScheduleDetailsBeforeTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedScheduleDetailsBeforeTransfer[index]
            );
          }
          const amountToTransferFirstSchedule = 20;
          const amountToTransferSecondSchedule = 30;

          await rNori
            .connect(hre.namedSigners.supplier)
            .safeBatchTransferFrom(
              supplier,
              investor1,
              [projectId1, projectId2],
              [amountToTransferFirstSchedule, amountToTransferSecondSchedule],
              '0x'
            );
          const supplierScheduleDetailsAfterTransfer =
            await rNori.batchGetScheduleDetailsForAccount(supplier, [
              projectId1,
              projectId2,
            ]);
          const investor1ScheduleDetailsAfterTransfer =
            await rNori.batchGetScheduleDetailsForAccount(investor1, [
              projectId1,
              projectId2,
            ]);

          const expectedSupplierScheduleDetailsAfterTransfer = [
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(
                restrictedAmounts[0] - amountToTransferFirstSchedule
              ),
              claimableAmount: BigNumber.from(
                restrictedAmounts[0] - amountToTransferFirstSchedule
              ),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(
                restrictedAmounts[1] - amountToTransferSecondSchedule
              ),
              claimableAmount: BigNumber.from(
                restrictedAmounts[1] - amountToTransferSecondSchedule
              ),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
          ];
          const expectedInvestor1ScheduleDetailsAfterTransfer = [
            {
              tokenHolder: investor1,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(amountToTransferFirstSchedule),
              claimableAmount: BigNumber.from(amountToTransferFirstSchedule),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
            {
              tokenHolder: investor1,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(amountToTransferSecondSchedule),
              claimableAmount: BigNumber.from(amountToTransferSecondSchedule),
              claimedAmount: BigNumber.from(0),
              quantityRevoked: BigNumber.from(0),
              exists: true,
            },
          ];

          for (const [
            index,
            scheduleDetail,
          ] of supplierScheduleDetailsAfterTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedSupplierScheduleDetailsAfterTransfer[index]
            );
          }

          for (const [
            index,
            scheduleDetail,
          ] of investor1ScheduleDetailsAfterTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedInvestor1ScheduleDetailsAfterTransfer[index]
            );
          }
        });

        it('should transfer the full balance of multiple token types to another account', async () => {
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
          const { listedRemovalIds: listedRemovalIds1, projectId: projectId1 } =
            await batchMintAndListRemovalsForSale({
              testSetup,
              removalDataToList: [removalDataToList[0]],
            });
          const { listedRemovalIds: listedRemovalIds2, projectId: projectId2 } =
            await batchMintAndListRemovalsForSale({
              testSetup,
              projectId: 999_999_999,
              removalDataToList: [removalDataToList[1]],
            });
          const { supplier, investor1 } = hre.namedAccounts;
          const restrictedAmounts = removalDataToList.map(
            (removalData) => removalData.amount
          );
          await restrictRemovalProceeds({
            testSetup,
            removalIds: [listedRemovalIds1[0], listedRemovalIds2[0]],
            removalAmountsToRestrict: restrictedAmounts,
          });
          const supplierScheduleDetailsBeforeTransfer =
            await rNori.batchGetScheduleDetailsForAccount(supplier, [
              projectId1,
              projectId2,
            ]);

          const expectedScheduleDetailsBeforeTransfer = [
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(restrictedAmounts[0]),
            },
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(restrictedAmounts[1]),
            },
          ];
          for (const [
            index,
            scheduleDetail,
          ] of supplierScheduleDetailsBeforeTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedScheduleDetailsBeforeTransfer[index]
            );
          }

          await rNori
            .connect(hre.namedSigners.supplier)
            .safeBatchTransferFrom(
              supplier,
              investor1,
              [projectId1, projectId2],
              [restrictedAmounts[0], restrictedAmounts[0]],
              '0x'
            );
          const supplierScheduleDetailsAfterTransfer =
            await rNori.batchGetScheduleDetailsForAccount(supplier, [
              projectId1,
              projectId2,
            ]);
          const investor1ScheduleDetailsAfterTransfer =
            await rNori.batchGetScheduleDetailsForAccount(investor1, [
              projectId1,
              projectId2,
            ]);

          const expectedSupplierScheduleDetailsAfterTransfer = [
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(0),
            },
            {
              tokenHolder: supplier,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(0),
            },
          ];
          const expectedInvestor1ScheduleDetailsAfterTransfer = [
            {
              tokenHolder: investor1,
              scheduleTokenId: projectId1,
              balance: BigNumber.from(restrictedAmounts[0]),
            },
            {
              tokenHolder: investor1,
              scheduleTokenId: projectId2,
              balance: BigNumber.from(restrictedAmounts[1]),
            },
          ];

          for (const [
            index,
            scheduleDetail,
          ] of supplierScheduleDetailsAfterTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedSupplierScheduleDetailsAfterTransfer[index]
            );
          }

          for (const [
            index,
            scheduleDetail,
          ] of investor1ScheduleDetailsAfterTransfer.entries()) {
            compareScheduleDetailForAddressStructs(
              scheduleDetail,
              expectedInvestor1ScheduleDetailsAfterTransfer[index]
            );
          }
          const scheduleSummariesAfterTransfer =
            await rNori.batchGetScheduleSummaries([projectId1, projectId2]);

          for (const scheduleSummary of scheduleSummariesAfterTransfer) {
            compareScheduleSummaryStructs(scheduleSummary, {
              tokenHolders: [investor1],
            });
          }
        });
      });
    });
    describe('failure', () => {
      it('should not allow an unapproved account even with DEFAULT_ADMIN_ROLE or SCHEDULE_CREATOR_ROLE to transfer tokens', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId } =
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
        await expect(
          rNori
            .connect(hre.namedSigners.admin)
            .safeTransferFrom(supplier, investor1, projectId, 50, '0x')
        ).to.be.revertedWith('ERC1155: caller is not owner nor approved');
      });
    });
  });
  describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
    describe('success', () => {
      it('should revoke a specific number of tokens, emit events, and account for the quantity revoked - single account', async () => {
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
        const testSetup = await setupTestLocal({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
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

      it('can revoke tokens correctly when there are multiple token holders and some tokens have already been claimed', async () => {
        const removalDataToList = [
          {
            amount: 3000,
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
        const testSetup = await setupTestLocal({});
        const { rNori, bpNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
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
        const newTimestamp = scheduleStartTime + SECONDS_IN_5_YEARS;
        await advanceTime({
          hre,
          timestamp: newTimestamp,
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
            newTimestamp,
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
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const {
          listedRemovalIds: listedRemovalIds1,
          projectId: projectId1,
          scheduleStartTime,
        } = await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList: [removalDataToList[0]],
        });
        const { listedRemovalIds: listedRemovalIds2, projectId: projectId2 } =
          await batchMintAndListRemovalsForSale({
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
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId, scheduleStartTime } =
          await batchMintAndListRemovalsForSale({
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
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds } = await batchMintAndListRemovalsForSale({
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
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
        const { listedRemovalIds, projectId } =
          await batchMintAndListRemovalsForSale({
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
