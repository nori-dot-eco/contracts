import { BigNumber } from 'ethers';

import {
  expect,
  advanceTime,
  batchMintAndListRemovalsForSale,
} from '@/test/helpers';
import {
  setupTestLocal,
  restrictRemovalProceeds,
  compareScheduleDetailForAddressStructs,
  compareScheduleSummaryStructs,
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
          },
        ];
        const testSetup = await setupTestLocal({});
        const { rNori, hre } = testSetup;
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
        const supplierScheduleDetailBeforeTransfer =
          await rNori.getScheduleDetailForAccount(supplier, projectId);

        const expectedScheduleDetailBeforeTransfer = {
          tokenHolder: supplier,
          scheduleTokenId: projectId,
          startTime: BigNumber.from(scheduleStartTime),
          endTime: BigNumber.from(scheduleStartTime).add(SECONDS_IN_10_YEARS),
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
          startTime: BigNumber.from(scheduleStartTime),
          endTime: BigNumber.from(scheduleStartTime).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(restrictedAmount / 2),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        const expectedInvestor1ScheduleDetailAfterTransfer = {
          tokenHolder: investor1,
          scheduleTokenId: projectId,
          startTime: BigNumber.from(scheduleStartTime),
          endTime: BigNumber.from(scheduleStartTime).add(SECONDS_IN_10_YEARS),
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
      // eslint-disable-next-line jest/expect-expect -- assertions in comparison utility
      it('should transfer all tokens to another account, resulting holder sets should be correct', async () => {
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
            startTime: BigNumber.from(scheduleStartTime),
            endTime: BigNumber.from(scheduleStartTime).add(SECONDS_IN_10_YEARS),
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
        const {
          listedRemovalIds: listedRemovalIds1,
          projectId: projectId1,
          scheduleStartTime: scheduleStartTime1,
        } = await batchMintAndListRemovalsForSale({
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
          await rNori.batchGetScheduleDetailsForAccount(supplier);

        const expectedScheduleDetailsBeforeTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: projectId1,
            startTime: BigNumber.from(scheduleStartTime1),
            endTime:
              BigNumber.from(scheduleStartTime1).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(restrictedAmounts[0]),
            claimableAmount: BigNumber.from(restrictedAmounts[0]),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: projectId2,
            startTime: BigNumber.from(scheduleStartTime2),
            endTime:
              BigNumber.from(scheduleStartTime2).add(SECONDS_IN_10_YEARS),
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
          await rNori.batchGetScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await rNori.batchGetScheduleDetailsForAccount(investor1);

        const expectedSupplierScheduleDetailsAfterTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: projectId1,
            startTime: BigNumber.from(scheduleStartTime1),
            endTime:
              BigNumber.from(scheduleStartTime1).add(SECONDS_IN_10_YEARS),
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
            startTime: BigNumber.from(scheduleStartTime2),
            endTime:
              BigNumber.from(scheduleStartTime2).add(SECONDS_IN_10_YEARS),
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
            startTime: BigNumber.from(scheduleStartTime1),
            endTime:
              BigNumber.from(scheduleStartTime1).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(amountToTransferFirstSchedule),
            claimableAmount: BigNumber.from(amountToTransferFirstSchedule),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: investor1,
            scheduleTokenId: projectId2,
            startTime: BigNumber.from(scheduleStartTime2),
            endTime:
              BigNumber.from(scheduleStartTime2).add(SECONDS_IN_10_YEARS),
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
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          rNori.getScheduleIdsForAccount(supplier),
          rNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(
          supplierScheduleSetAfterTransfer.map((scheduleId) =>
            scheduleId.toHexString()
          )
        ).to.have.deep.members([
          BigNumber.from(projectId1).toHexString(),
          BigNumber.from(projectId2).toHexString(),
        ]);
        expect(
          investorScheduleSetAfterTransfer.map((scheduleId) =>
            scheduleId.toHexString()
          )
        ).to.have.members([
          BigNumber.from(projectId1).toHexString(),
          BigNumber.from(projectId2).toHexString(),
        ]);
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
          await rNori.batchGetScheduleDetailsForAccount(supplier);

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
          await rNori.batchGetScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await rNori.batchGetScheduleDetailsForAccount(investor1);

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
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          rNori.getScheduleIdsForAccount(supplier),
          rNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(supplierScheduleSetAfterTransfer.length).to.equal(0);
        expect(
          investorScheduleSetAfterTransfer.map((scheduleId) =>
            scheduleId.toHexString()
          )
        ).to.have.deep.members([
          BigNumber.from(projectId1).toHexString(),
          BigNumber.from(projectId2).toHexString(),
        ]);
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
      ).to.be.reverted;
    });
  });
});
