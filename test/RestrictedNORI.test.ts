import { BigNumber } from 'ethers';

import { expect, setupTest, advanceTime } from '@/test/helpers';
import {
  setupTestRestrictedNORI,
  formatTokensReceivedUserData,
  restrictRemovalProceeds,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  UNIX_EPOCH_2021,
  UNIX_EPOCH_2023,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
} from '@/test/helpers/restricted-nori';

describe('RestrictedNORI', () => {
  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      for (const { role, expectedCount } of [
        { role: 'DEFAULT_ADMIN_ROLE', expectedCount: 1 },
        { role: 'PAUSER_ROLE', expectedCount: 1 },
        { role: 'SCHEDULE_CREATOR_ROLE', expectedCount: 2 }, // Removal contract is a restriction creator
        { role: 'TOKEN_REVOKER_ROLE', expectedCount: 1 },
        { role: 'CONTRACT_INITIALIZER_ROLE', expectedCount: 1 },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { rNori, hre } = await setupTest();
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
    });
  });
  describe('restriction duration map', () => {
    it('should be initialized to 10 years for a methodology of 1 and methodology version of 0', async () => {
      const { rNori } = await setupTestRestrictedNORI({});
      const retrievedRestrictionDuration =
        await rNori.getRestrictionDurationForMethodologyAndVersion(1, 0);
      expect(retrievedRestrictionDuration).to.equal(SECONDS_IN_10_YEARS);
    });
    it('should be able to set and get a new restriction duration for a given methodology and version', async () => {
      const { rNori } = await setupTestRestrictedNORI({});
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
      const { rNori } = await setupTestRestrictedNORI({});
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
  });
  describe('tokensReceived', () => {
    it('should deposit tokens and automatically create a new restriction schedule where one does not exist', async () => {
      const removalDataToList = [
        {
          amount: 5,
          vintage: 2018,
          restrictionScheduleStartTime: UNIX_EPOCH_2021,
        },
      ];
      const { bpNori, rNori, listedRemovalIds, restrictionScheduleIds, hre } =
        await setupTestRestrictedNORI({
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
      const restrictionScheduleDetail =
        await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);
      expect(restrictionScheduleDetail.scheduleTokenId).equals(
        restrictionScheduleIds[0]
      );
      expect(restrictionScheduleDetail.totalSupply).equals(restrictedAmount);
      expect(restrictionScheduleDetail.tokenHolders[0]).equals(
        namedAccounts.supplier
      );
      expect(restrictionScheduleDetail.startTime).equals(UNIX_EPOCH_2021);
      expect(restrictionScheduleDetail.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_10_YEARS
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
          restrictionScheduleStartTime: UNIX_EPOCH_2021,
        },
      ];
      const { bpNori, rNori, listedRemovalIds, hre } =
        await setupTestRestrictedNORI({
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
          restrictionScheduleStartTime: UNIX_EPOCH_2023,
        },
      ];
      const testSetup = await setupTestRestrictedNORI({
        removalDataToList,
      });
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const { supplier } = hre.namedAccounts;
      const removalAmountsToRestrict = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToRestrict,
      });
      const claimableBalanceForSchedule =
        await rNori.claimableBalanceForSchedule(restrictionScheduleIds[0]);
      expect(claimableBalanceForSchedule).to.equal(0);
      await expect(
        rNori
          .connect(hre.namedSigners.supplier)
          .withdrawFromRestrictionSchedule(
            supplier,
            restrictionScheduleIds[0],
            removalAmountsToRestrict[0]
          )
      ).revertedWith(
        `InsufficientClaimableBalance("${supplier}", ${restrictionScheduleIds[0]})`
      );
    });
    it('should return the full amount at the end of the restriction schedule', async () => {
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
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const restrictedAmount = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToRestrict: [restrictedAmount],
      });
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_10_YEARS,
      });
      const claimableBalanceOf =
        await rNori.claimableBalanceForScheduleForAccount(
          restrictionScheduleIds[0],
          hre.namedAccounts.supplier
        );
      expect(claimableBalanceOf).to.equal(restrictedAmount);
      await rNori
        .connect(await hre.ethers.getSigner(hre.namedAccounts.supplier))
        .withdrawFromRestrictionSchedule(
          hre.namedAccounts.supplier,
          restrictionScheduleIds[0],
          removalDataToList[0].amount
        );
    });
    it('should release linearly as expected and increase the current released amount when the total amount increases', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          restrictionScheduleStartTime: UNIX_EPOCH_2018,
        },
        {
          amount: 100,
          vintage: 2019,
          restrictionScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestRestrictedNORI({
        removalDataToList,
      });
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const firstAmountToRestrict = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: [removalDataToList[0]],
        removalAmountsToRestrict: [firstAmountToRestrict],
      });
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
      });
      const originalClaimableBalanceForSchedule =
        await rNori.claimableBalanceForSchedule(restrictionScheduleIds[0]);
      expect(originalClaimableBalanceForSchedule).to.equal(
        removalDataToList[0].amount / 2
      );
      const secondAmountToRestrict = removalDataToList[1].amount;
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: [removalDataToList[1]],
        removalAmountsToRestrict: [secondAmountToRestrict],
      });
      const claimableBalanceAfterSecondRestriction =
        await rNori.claimableBalanceForSchedule(restrictionScheduleIds[0]);
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
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });
        const { rNori, bpNori, hre, restrictionScheduleIds } = testSetup;
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

        const { supplier } = hre.namedAccounts;
        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          );
        expect(
          await rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromRestrictionSchedule(
              supplier,
              restrictionScheduleIds[0],
              claimableBalance
            )
        )
          .to.emit(rNori, 'TokensClaimed')
          .withArgs(
            supplier,
            supplier,
            restrictionScheduleIds[0],
            claimableBalance
          );

        expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
          BigNumber.from(amountToRestrict).sub(claimableBalance)
        );
        expect(
          await rNori.balanceOf(supplier, restrictionScheduleIds[0])
        ).to.equal(BigNumber.from(amountToRestrict).sub(claimableBalance));
        expect(
          await rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          )
        ).to.equal(0);
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(claimableBalance);
      });
      it('can withdraw to a different address from the restriction schedule holder', async () => {
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
        const { rNori, bpNori, hre, restrictionScheduleIds } = testSetup;
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

        const { supplier, investor1 } = hre.namedAccounts;
        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          );
        expect(
          await rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromRestrictionSchedule(
              investor1,
              restrictionScheduleIds[0],
              claimableBalance
            )
        )
          .to.emit(rNori, 'TokensClaimed')
          .withArgs(
            supplier,
            investor1,
            restrictionScheduleIds[0],
            claimableBalance
          );

        expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
          BigNumber.from(amountToRestrict).sub(claimableBalance)
        );
        expect(
          await rNori.balanceOf(supplier, restrictionScheduleIds[0])
        ).to.equal(BigNumber.from(amountToRestrict).sub(claimableBalance));
        expect(
          await rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          )
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
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });
        const { rNori, bpNori, hre, restrictionScheduleIds } = testSetup;
        const { supplier, investor1, employee } = hre.namedAccounts;

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

        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const [
          supplierClaimableBalanceBeforeClaim,
          investorClaimableBalanceBeforeClaim,
          employeeClaimableBalanceBeforeClaim,
        ] = await Promise.all([
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          ),
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            investor1
          ),
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            employee
          ),
        ]);
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          amountToRestrict / 3 / 2
        );
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          amountToRestrict / 3 / 2
        );
        expect(employeeClaimableBalanceBeforeClaim).to.equal(
          amountToRestrict / 3 / 2
        );
        await rNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromRestrictionSchedule(
            supplier,
            restrictionScheduleIds[0],
            supplierClaimableBalanceBeforeClaim
          );
        const [
          supplierClaimableBalanceAfterClaim,
          investorClaimableBalanceAfterClaim,
          employeeClaimableBalanceAfterClaim,
        ] = await Promise.all([
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          ),
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            investor1
          ),
          rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            employee
          ),
        ]);

        expect(supplierClaimableBalanceAfterClaim).to.equal(0);

        expect(investorClaimableBalanceAfterClaim).to.equal(
          investorClaimableBalanceBeforeClaim
        );
        expect(employeeClaimableBalanceAfterClaim).to.equal(
          employeeClaimableBalanceBeforeClaim
        );

        expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
          BigNumber.from(amountToRestrict).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(
          await rNori.balanceOf(supplier, restrictionScheduleIds[0])
        ).to.equal(
          BigNumber.from(amountToRestrict / 3).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(
          await rNori.balanceOf(investor1, restrictionScheduleIds[0])
        ).to.equal(BigNumber.from(amountToRestrict / 3));
        expect(
          await rNori.balanceOf(employee, restrictionScheduleIds[0])
        ).to.equal(BigNumber.from(amountToRestrict / 3));
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
            restrictionScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestRestrictedNORI({
          removalDataToList,
        });
        const { rNori, hre, restrictionScheduleIds } = testSetup;
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

        const { supplier } = hre.namedAccounts;
        const claimableBalance =
          await rNori.claimableBalanceForScheduleForAccount(
            restrictionScheduleIds[0],
            supplier
          );
        const attemptToWithdrawAmount = claimableBalance.add(1);
        await expect(
          rNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromRestrictionSchedule(
              supplier,
              restrictionScheduleIds[0],
              attemptToWithdrawAmount
            )
        ).to.be.revertedWith(
          `InsufficientClaimableBalance("${supplier}", ${restrictionScheduleIds[0]})`
        );
      });
    });
  });
  describe('Disabled functions', () => {
    it('should fail to *burn*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          restrictionScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestRestrictedNORI({ removalDataToList });
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const amountToRestrict = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToRestrict: [amountToRestrict],
      });
      const { supplier } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(
        await rNori.balanceOf(supplier, restrictionScheduleIds[0])
      ).to.equal(amountToRestrict);
      await expect(
        rNori
          .connect(supplierSigner)
          .burn(supplier, restrictionScheduleIds[0], amountToRestrict)
      ).to.be.revertedWith('BurningNotSupported');
      expect(
        await rNori.balanceOf(supplier, restrictionScheduleIds[0])
      ).to.equal(amountToRestrict);
      expect(await rNori.totalSupply(restrictionScheduleIds[0])).to.equal(
        amountToRestrict
      );
    });
    it('should fail to *burnBatch*', async () => {
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
      const testSetup = await setupTestRestrictedNORI({ removalDataToList });
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const amountsToRestrict = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToRestrict: amountsToRestrict,
      });
      const { supplier } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(
        (
          await rNori.balanceOfBatch(
            [supplier, supplier],
            restrictionScheduleIds
          )
        ).map((balance) => balance.toNumber())
      ).to.eql(amountsToRestrict);
      await expect(
        rNori
          .connect(supplierSigner)
          .burnBatch(supplier, restrictionScheduleIds, amountsToRestrict)
      ).to.be.revertedWith('BurningNotSupported');
      expect(
        (
          await rNori.balanceOfBatch(
            [supplier, supplier],
            restrictionScheduleIds
          )
        ).map((balance) => balance.toNumber())
      ).to.eql(amountsToRestrict);
    });

    it('should fail to *setApprovalForAll*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          restrictionScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestRestrictedNORI({ removalDataToList });
      const { rNori, hre } = testSetup;
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      await expect(
        rNori.connect(supplierSigner).setApprovalForAll(investor1, true)
      ).to.be.revertedWith('OperatorActionsNotSupported');
    });

    it('should revert on *isApprovedForAll*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          restrictionScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestRestrictedNORI({ removalDataToList });
      const { rNori, hre } = testSetup;
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      await expect(
        rNori.connect(supplierSigner).isApprovedForAll(investor1, supplier)
      ).to.be.revertedWith('OperatorActionsNotSupported');
    });
  });
});
