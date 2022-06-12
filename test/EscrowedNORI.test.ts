import { BigNumber } from 'ethers';

import { expect, setupTest, advanceTime } from '@/test/helpers';
import {
  setupTestEscrowedNORI,
  formatTokensReceivedUserData,
  sendRemovalProceedsToEscrow,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  UNIX_EPOCH_2021,
  UNIX_EPOCH_2023,
  SECONDS_IN_10_YEARS,
  SECONDS_IN_1_YEAR_AVG,
  SECONDS_IN_5_YEARS,
} from '@/test/helpers/escrowed-nori';

describe('EscrowedNORI', () => {
  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      for (const { role, expectedCount } of [
        { role: 'DEFAULT_ADMIN_ROLE', expectedCount: 1 },
        { role: 'PAUSER_ROLE', expectedCount: 1 },
        { role: 'ESCROW_CREATOR_ROLE', expectedCount: 2 }, // Removal contract is an escrow creator
        { role: 'TOKEN_REVOKER_ROLE', expectedCount: 1 },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { eNori, hre } = await setupTest();
          expect(
            await eNori.hasRole(await eNori[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await eNori.getRoleAdmin(await eNori[role]())).to.eq(
            await eNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await eNori.getRoleMemberCount(await eNori[role]())).to.eq(
            expectedCount
          );
        });
      }
    });
  });
  describe('escrow duration map', () => {
    it('should be initialized to 10 years for a methodology of 1 and methodology version of 0', async () => {
      const { eNori } = await setupTestEscrowedNORI({});
      const retrievedEscrowDuration =
        await eNori.getEscrowDurationForMethodologyAndVersion(1, 0);
      expect(retrievedEscrowDuration).to.equal(SECONDS_IN_10_YEARS);
    });
    it('should be able to set and get a new escrow duration for a given methodology and version', async () => {
      const { eNori } = await setupTestEscrowedNORI({});
      const methodology = 2;
      const methodologyVersion = 0;
      const newDuration = SECONDS_IN_1_YEAR_AVG;
      const scheduleDurationBeforeSetting =
        await eNori.getEscrowDurationForMethodologyAndVersion(
          methodology,
          methodologyVersion
        );
      expect(scheduleDurationBeforeSetting).to.equal(0);
      await eNori.setEscrowDurationForMethodologyAndVersion(
        methodology,
        methodologyVersion,
        newDuration
      );
      const scheduleDurationAfterSetting =
        await eNori.getEscrowDurationForMethodologyAndVersion(
          methodology,
          methodologyVersion
        );
      expect(scheduleDurationAfterSetting).to.equal(SECONDS_IN_1_YEAR_AVG);
    });
    it('should revert if the transaction sender does not have the DEFAULT_ADMIN_ROLE', async () => {
      const { eNori } = await setupTestEscrowedNORI({});
      const methodology = 2;
      const methodologyVersion = 0;
      const newDuration = SECONDS_IN_1_YEAR_AVG;
      await expect(
        eNori
          .connect(hre.namedSigners.buyer) // funded address without DEFAULT_ADMIN_ROLE
          .setEscrowDurationForMethodologyAndVersion(
            methodology,
            methodologyVersion,
            newDuration
          )
      ).to.be.reverted;
    });
  });
  describe('tokensReceived', () => {
    it('should deposit tokens and automatically create a new escrow schedule where one does not exist', async () => {
      const removalDataToList = [
        { amount: 5, vintage: 2018, escrowScheduleStartTime: UNIX_EPOCH_2021 },
      ];
      const { bpNori, eNori, listedRemovalIds, escrowScheduleIds, hre } =
        await setupTestEscrowedNORI({
          removalDataToList,
        });
      const { namedAccounts } = hre;
      const escrowedAmount = 1;
      const userData = formatTokensReceivedUserData(listedRemovalIds[0]);
      expect(await bpNori.send(eNori.address, escrowedAmount, userData))
        .to.emit(eNori, 'Minted')
        .withArgs(
          bpNori.address,
          namedAccounts.supplier,
          escrowedAmount,
          userData,
          '0x'
        )
        .to.emit(eNori, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          namedAccounts.supplier,
          escrowedAmount
        )
        .to.emit(bpNori, 'Sent')
        .withArgs(
          namedAccounts.admin,
          namedAccounts.admin,
          eNori.address,
          escrowedAmount,
          userData,
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(namedAccounts.admin, eNori.address, escrowedAmount);
      const escrowScheduleDetail = await eNori.getEscrowScheduleSummary(
        escrowScheduleIds[0]
      );
      expect(escrowScheduleDetail.scheduleTokenId).equals(escrowScheduleIds[0]);
      expect(escrowScheduleDetail.totalSupply).equals(escrowedAmount);
      expect(escrowScheduleDetail.tokenHolders[0]).equals(
        namedAccounts.supplier
      );
      expect(escrowScheduleDetail.startTime).equals(UNIX_EPOCH_2021);
      expect(escrowScheduleDetail.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_10_YEARS
      );
      expect(escrowScheduleDetail.totalClaimedAmount).equals(0);
      expect(escrowScheduleDetail.totalQuantityRevoked).equals(0);
      expect(escrowScheduleDetail.exists).equals(true);
    });
  });
  describe('Linear releasing (claimableBalanceForSchedule)', () => {
    it('should return 0 before schedule start time', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2020,
          escrowScheduleStartTime: UNIX_EPOCH_2023,
        },
      ];
      const testSetup = await setupTestEscrowedNORI({
        removalDataToList,
      });
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const { supplier } = hre.namedAccounts;
      const removalAmountsToEscrow = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow,
      });
      const claimableBalanceForSchedule =
        await eNori.claimableBalanceForSchedule(escrowScheduleIds[0]);
      expect(claimableBalanceForSchedule).to.equal(0);
      await expect(
        eNori
          .connect(hre.namedSigners.supplier)
          .withdrawFromEscrowSchedule(
            supplier,
            escrowScheduleIds[0],
            removalAmountsToEscrow[0]
          )
      ).revertedWith(
        `InsufficientClaimableBalance("${supplier}", ${escrowScheduleIds[0]})`
      );
    });
    it('should return the full amount at the end of the escrow schedule', async () => {
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
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const escrowedAmount = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [escrowedAmount],
      });
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_10_YEARS,
      });
      const claimableBalanceOf =
        await eNori.claimableBalanceForScheduleForAccount(
          escrowScheduleIds[0],
          hre.namedAccounts.supplier
        );
      expect(claimableBalanceOf).to.equal(escrowedAmount);
      await eNori
        .connect(await hre.ethers.getSigner(hre.namedAccounts.supplier))
        .withdrawFromEscrowSchedule(
          hre.namedAccounts.supplier,
          escrowScheduleIds[0],
          removalDataToList[0].amount
        );
    });
    it('should release linearly as expected and increase the current released amount when the total amount increases', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
        {
          amount: 100,
          vintage: 2019,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestEscrowedNORI({
        removalDataToList,
      });
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const firstAmountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: [removalDataToList[0]],
        removalAmountsToEscrow: [firstAmountToEscrow],
      });
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
      });
      const originalClaimableBalanceForSchedule =
        await eNori.claimableBalanceForSchedule(escrowScheduleIds[0]);
      expect(originalClaimableBalanceForSchedule).to.equal(
        removalDataToList[0].amount / 2
      );
      const secondAmountToEscrow = removalDataToList[1].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: [removalDataToList[1]],
        removalAmountsToEscrow: [secondAmountToEscrow],
      });
      const claimableBalanceAfterSecondEscrowing =
        await eNori.claimableBalanceForSchedule(escrowScheduleIds[0]);
      expect(claimableBalanceAfterSecondEscrowing).to.equal(
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
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });
        const { eNori, bpNori, hre, escrowScheduleIds } = testSetup;
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

        const { supplier } = hre.namedAccounts;
        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          );
        expect(
          await eNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromEscrowSchedule(
              supplier,
              escrowScheduleIds[0],
              claimableBalance
            )
        )
          .to.emit(eNori, 'TokensClaimed')
          .withArgs(supplier, supplier, escrowScheduleIds[0], claimableBalance);

        expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow).sub(claimableBalance)
        );
        expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow).sub(claimableBalance)
        );
        expect(
          await eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          )
        ).to.equal(0);
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(claimableBalance);
      });
      it('can withdraw to a different address from the escrow schedule holder', async () => {
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
        const { eNori, bpNori, hre, escrowScheduleIds } = testSetup;
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

        const { supplier, investor1 } = hre.namedAccounts;
        const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();
        const claimableBalance =
          await eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          );
        expect(
          await eNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromEscrowSchedule(
              investor1,
              escrowScheduleIds[0],
              claimableBalance
            )
        )
          .to.emit(eNori, 'TokensClaimed')
          .withArgs(
            supplier,
            investor1,
            escrowScheduleIds[0],
            claimableBalance
          );

        expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow).sub(claimableBalance)
        );
        expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow).sub(claimableBalance)
        );
        expect(
          await eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          )
        ).to.equal(0);
        expect(await bpNori.totalSupply()).to.equal(
          bpNoriSupplyBeforeWithdrawl
        );
        expect(await bpNori.balanceOf(supplier)).to.equal(0);
        expect(await bpNori.balanceOf(investor1)).to.equal(claimableBalance);
      });
      it('can withdraw correctly from an escrow schedule with multiple token holders', async () => {
        const removalDataToList = [
          {
            amount: 3000,
            vintage: 2018,
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });
        const { eNori, bpNori, hre, escrowScheduleIds } = testSetup;
        const { supplier, investor1, employee } = hre.namedAccounts;

        const amountToEscrow = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [amountToEscrow],
        });
        await Promise.all([
          eNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(
              supplier,
              investor1,
              escrowScheduleIds[0],
              1000,
              '0x'
            ),
          eNori
            .connect(hre.namedSigners.supplier)
            .safeTransferFrom(
              supplier,
              employee,
              escrowScheduleIds[0],
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
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          ),
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            investor1
          ),
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            employee
          ),
        ]);
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          amountToEscrow / 3 / 2
        );
        expect(supplierClaimableBalanceBeforeClaim).to.equal(
          amountToEscrow / 3 / 2
        );
        expect(employeeClaimableBalanceBeforeClaim).to.equal(
          amountToEscrow / 3 / 2
        );
        await eNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawFromEscrowSchedule(
            supplier,
            escrowScheduleIds[0],
            supplierClaimableBalanceBeforeClaim
          );
        const [
          supplierClaimableBalanceAfterClaim,
          investorClaimableBalanceAfterClaim,
          employeeClaimableBalanceAfterClaim,
        ] = await Promise.all([
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          ),
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            investor1
          ),
          eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
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

        expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow / 3).sub(
            supplierClaimableBalanceBeforeClaim
          )
        );
        expect(await eNori.balanceOf(investor1, escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow / 3)
        );
        expect(await eNori.balanceOf(employee, escrowScheduleIds[0])).to.equal(
          BigNumber.from(amountToEscrow / 3)
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
            escrowScheduleStartTime: UNIX_EPOCH_2018,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });
        const { eNori, hre, escrowScheduleIds } = testSetup;
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

        const { supplier } = hre.namedAccounts;
        const claimableBalance =
          await eNori.claimableBalanceForScheduleForAccount(
            escrowScheduleIds[0],
            supplier
          );
        const attemptToWithdrawAmount = claimableBalance.add(1);
        await expect(
          eNori
            .connect(await hre.ethers.getSigner(supplier))
            .withdrawFromEscrowSchedule(
              supplier,
              escrowScheduleIds[0],
              attemptToWithdrawAmount
            )
        ).to.be.revertedWith(
          `InsufficientClaimableBalance("${supplier}", ${escrowScheduleIds[0]})`
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
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestEscrowedNORI({ removalDataToList });
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const amountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [amountToEscrow],
      });
      const { supplier } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
        amountToEscrow
      );
      await expect(
        eNori
          .connect(supplierSigner)
          .burn(supplier, escrowScheduleIds[0], amountToEscrow)
      ).to.be.revertedWith('BurningNotSupported');
      expect(await eNori.balanceOf(supplier, escrowScheduleIds[0])).to.equal(
        amountToEscrow
      );
      expect(await eNori.totalSupply(escrowScheduleIds[0])).to.equal(
        amountToEscrow
      );
    });
    it('should fail to *burnBatch*', async () => {
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
      const testSetup = await setupTestEscrowedNORI({ removalDataToList });
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const amountsToEscrow = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: amountsToEscrow,
      });
      const { supplier } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(
        (
          await eNori.balanceOfBatch([supplier, supplier], escrowScheduleIds)
        ).map((balance) => balance.toNumber())
      ).to.eql(amountsToEscrow);
      await expect(
        eNori
          .connect(supplierSigner)
          .burnBatch(supplier, escrowScheduleIds, amountsToEscrow)
      ).to.be.revertedWith('BurningNotSupported');
      expect(
        (
          await eNori.balanceOfBatch([supplier, supplier], escrowScheduleIds)
        ).map((balance) => balance.toNumber())
      ).to.eql(amountsToEscrow);
    });

    it('should fail to *setApprovalForAll*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestEscrowedNORI({ removalDataToList });
      const { eNori, hre } = testSetup;
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      await expect(
        eNori.connect(supplierSigner).setApprovalForAll(investor1, true)
      ).to.be.revertedWith('OperatorActionsNotSupported');
    });

    it('should revert on *isApprovedForAll*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestEscrowedNORI({ removalDataToList });
      const { eNori, hre } = testSetup;
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      await expect(
        eNori.connect(supplierSigner).isApprovedForAll(investor1, supplier)
      ).to.be.revertedWith('OperatorActionsNotSupported');
    });
  });
});
