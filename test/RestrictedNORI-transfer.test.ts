import { BigNumber } from 'ethers';

import { expect, advanceTime } from '@/test/helpers';
import {
  setupTestRestrictedNORI,
  restrictRemovalProceeds,
  compareRestrictionScheduleDetailForAddressStructs,
  compareRestrictionScheduleSummaryStructs,
  NOW,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  SECONDS_IN_10_YEARS,
} from '@/test/helpers/restricted-nori';

describe('RestrictedNORI transferring', () => {
  describe('success', () => {
    describe('safeTransferFrom', () => {
      // eslint-disable-next-line jest/expect-expect -- assertions are in helper function
      it('should transfer some tokens to another account', async () => {
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
        const { rNori, hre, restrictionScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [restrictedAmount],
        });
        const supplierScheduleDetailBeforeTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          );

        const expectedScheduleDetailBeforeTransfer = {
          tokenHolder: supplier,
          scheduleTokenId: restrictionScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(restrictedAmount),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        compareRestrictionScheduleDetailForAddressStructs(
          supplierScheduleDetailBeforeTransfer,
          expectedScheduleDetailBeforeTransfer
        );
        await rNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            restrictionScheduleIds[0],
            50,
            '0x'
          );
        const supplierScheduleDetailAfterTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          );
        const investor1ScheduleDetailAfterTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            investor1,
            restrictionScheduleIds[0]
          );

        const expectedSupplierScheduleDetailAfterTransfer = {
          tokenHolder: supplier,
          scheduleTokenId: restrictionScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(restrictedAmount / 2),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        const expectedInvestor1ScheduleDetailAfterTransfer = {
          tokenHolder: investor1,
          scheduleTokenId: restrictionScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(restrictedAmount / 2),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        compareRestrictionScheduleDetailForAddressStructs(
          supplierScheduleDetailAfterTransfer,
          expectedSupplierScheduleDetailAfterTransfer
        );
        compareRestrictionScheduleDetailForAddressStructs(
          investor1ScheduleDetailAfterTransfer,
          expectedInvestor1ScheduleDetailAfterTransfer
        );
      });
      // eslint-disable-next-line jest/expect-expect -- assertions in comparison utility
      it('should transfer all tokens to another account, resulting holder sets should be correct', async () => {
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
        const { rNori, hre, restrictionScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const restrictedAmount = removalDataToList[0].amount;
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: [restrictedAmount],
        });
        const supplierScheduleDetailBeforeTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          );
        compareRestrictionScheduleDetailForAddressStructs(
          supplierScheduleDetailBeforeTransfer,
          {
            startTime: BigNumber.from(NOW),
            endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(restrictedAmount),
          }
        );
        const scheduleSummaryBeforeTransfer =
          await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);
        compareRestrictionScheduleSummaryStructs(scheduleSummaryBeforeTransfer, {
          tokenHolders: [supplier],
        });
        await rNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            restrictionScheduleIds[0],
            restrictedAmount,
            '0x'
          );
        const supplierScheduleDetailAfterTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            supplier,
            restrictionScheduleIds[0]
          );
        const investor1ScheduleDetailAfterTransfer =
          await rNori.getRestrictionScheduleDetailForAccount(
            investor1,
            restrictionScheduleIds[0]
          );
        const scheduleSummaryAfterTransfer =
          await rNori.getRestrictionScheduleSummary(restrictionScheduleIds[0]);

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
        compareRestrictionScheduleDetailForAddressStructs(
          supplierScheduleDetailAfterTransfer,
          expectedSupplierScheduleDetailAfterTransfer
        );
        compareRestrictionScheduleDetailForAddressStructs(
          investor1ScheduleDetailAfterTransfer,
          expectedInvestor1ScheduleDetailAfterTransfer
        );
        compareRestrictionScheduleSummaryStructs(scheduleSummaryAfterTransfer, {
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
        const { rNori, hre, restrictionScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const restrictedAmounts = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: restrictedAmounts,
        });
        // just to make the claimable balances easily computable
        advanceTime({ hre, timestamp: UNIX_EPOCH_2019 + SECONDS_IN_10_YEARS });
        const supplierScheduleDetailsBeforeTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(supplier);

        const expectedScheduleDetailsBeforeTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[0],
            startTime: BigNumber.from(UNIX_EPOCH_2018),
            endTime: BigNumber.from(UNIX_EPOCH_2018).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(restrictedAmounts[0]),
            claimableAmount: BigNumber.from(restrictedAmounts[0]),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[1],
            startTime: BigNumber.from(UNIX_EPOCH_2019),
            endTime: BigNumber.from(UNIX_EPOCH_2019).add(SECONDS_IN_10_YEARS),
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
          compareRestrictionScheduleDetailForAddressStructs(
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
            restrictionScheduleIds,
            [amountToTransferFirstSchedule, amountToTransferSecondSchedule],
            '0x'
          );
        const supplierScheduleDetailsAfterTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(investor1);

        const expectedSupplierScheduleDetailsAfterTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[0],
            startTime: BigNumber.from(UNIX_EPOCH_2018),
            endTime: BigNumber.from(UNIX_EPOCH_2018).add(SECONDS_IN_10_YEARS),
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
            scheduleTokenId: restrictionScheduleIds[1],
            startTime: BigNumber.from(UNIX_EPOCH_2019),
            endTime: BigNumber.from(UNIX_EPOCH_2019).add(SECONDS_IN_10_YEARS),
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
            scheduleTokenId: restrictionScheduleIds[0],
            startTime: BigNumber.from(UNIX_EPOCH_2018),
            endTime: BigNumber.from(UNIX_EPOCH_2018).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(amountToTransferFirstSchedule),
            claimableAmount: BigNumber.from(amountToTransferFirstSchedule),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: investor1,
            scheduleTokenId: restrictionScheduleIds[1],
            startTime: BigNumber.from(UNIX_EPOCH_2019),
            endTime: BigNumber.from(UNIX_EPOCH_2019).add(SECONDS_IN_10_YEARS),
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
          compareRestrictionScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedSupplierScheduleDetailsAfterTransfer[index]
          );
        }

        for (const [
          index,
          scheduleDetail,
        ] of investor1ScheduleDetailsAfterTransfer.entries()) {
          compareRestrictionScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedInvestor1ScheduleDetailsAfterTransfer[index]
          );
        }
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          rNori.getScheduleIdsForAccount(supplier),
          rNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(supplierScheduleSetAfterTransfer).to.have.deep.members(
          restrictionScheduleIds
        );
        expect(investorScheduleSetAfterTransfer).to.have.deep.members(
          restrictionScheduleIds
        );
      });

      it('should transfer the full balance of multiple token types to another account', async () => {
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
        const { rNori, hre, restrictionScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const restrictedAmounts = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await restrictRemovalProceeds({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToRestrict: restrictedAmounts,
        });
        const supplierScheduleDetailsBeforeTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(supplier);

        const expectedScheduleDetailsBeforeTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[0],
            balance: BigNumber.from(restrictedAmounts[0]),
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[1],
            balance: BigNumber.from(restrictedAmounts[1]),
          },
        ];
        for (const [
          index,
          scheduleDetail,
        ] of supplierScheduleDetailsBeforeTransfer.entries()) {
          compareRestrictionScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedScheduleDetailsBeforeTransfer[index]
          );
        }

        await rNori
          .connect(hre.namedSigners.supplier)
          .safeBatchTransferFrom(
            supplier,
            investor1,
            restrictionScheduleIds,
            [restrictedAmounts[0], restrictedAmounts[0]],
            '0x'
          );
        const supplierScheduleDetailsAfterTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await rNori.batchGetRestrictionScheduleDetailsForAccount(investor1);

        const expectedSupplierScheduleDetailsAfterTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[0],
            balance: BigNumber.from(0),
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: restrictionScheduleIds[1],
            balance: BigNumber.from(0),
          },
        ];
        const expectedInvestor1ScheduleDetailsAfterTransfer = [
          {
            tokenHolder: investor1,
            scheduleTokenId: restrictionScheduleIds[0],
            balance: BigNumber.from(restrictedAmounts[0]),
          },
          {
            tokenHolder: investor1,
            scheduleTokenId: restrictionScheduleIds[1],
            balance: BigNumber.from(restrictedAmounts[1]),
          },
        ];

        for (const [
          index,
          scheduleDetail,
        ] of supplierScheduleDetailsAfterTransfer.entries()) {
          compareRestrictionScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedSupplierScheduleDetailsAfterTransfer[index]
          );
        }

        for (const [
          index,
          scheduleDetail,
        ] of investor1ScheduleDetailsAfterTransfer.entries()) {
          compareRestrictionScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedInvestor1ScheduleDetailsAfterTransfer[index]
          );
        }
        const scheduleSummariesAfterTransfer =
          await rNori.batchGetRestrictionScheduleSummaries(restrictionScheduleIds);

        for (const scheduleSummary of scheduleSummariesAfterTransfer) {
          compareRestrictionScheduleSummaryStructs(scheduleSummary, {
            tokenHolders: [investor1],
          });
        }
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          rNori.getScheduleIdsForAccount(supplier),
          rNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(supplierScheduleSetAfterTransfer.length).to.equal(0);
        expect(investorScheduleSetAfterTransfer).to.have.deep.members(
          restrictionScheduleIds
        );
      });
    });
  });
  describe('failure', () => {
    it('should not allow an account with DEFAULT_ADMIN_ROLE or SCHEDULE_CREATOR_ROLE to transfer tokens', async () => {
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
      const { rNori, hre, restrictionScheduleIds } = testSetup;
      const { supplier, investor1 } = hre.namedAccounts;
      const restrictedAmount = removalDataToList[0].amount;
      await restrictRemovalProceeds({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToRestrict: [restrictedAmount],
      });
      await expect(
        rNori
          .connect(hre.namedSigners.admin)
          .safeTransferFrom(supplier, investor1, restrictionScheduleIds[0], 50, '0x')
      ).to.be.revertedWith('OperatorActionsNotSupported()');
    });
  });
});
