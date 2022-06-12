import { BigNumber } from 'ethers';

import { expect, advanceTime } from '@/test/helpers';
import {
  setupTestEscrowedNORI,
  sendRemovalProceedsToEscrow,
  compareEscrowScheduleDetailForAddressStructs,
  compareEscrowScheduleSummaryStructs,
  NOW,
  UNIX_EPOCH_2018,
  UNIX_EPOCH_2019,
  SECONDS_IN_10_YEARS,
} from '@/test/helpers/escrowed-nori';

describe('EscrowedNORI transferring', () => {
  describe('success', () => {
    describe('safeTransferFrom', () => {
      // eslint-disable-next-line jest/expect-expect -- assertions are in helper function
      it('should transfer some tokens to another account', async () => {
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
        const { eNori, hre, escrowScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const escrowedAmount = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [escrowedAmount],
        });
        const supplierScheduleDetailBeforeTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );

        const expectedScheduleDetailBeforeTransfer = {
          tokenHolder: supplier,
          scheduleTokenId: escrowScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(escrowedAmount),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        compareEscrowScheduleDetailForAddressStructs(
          supplierScheduleDetailBeforeTransfer,
          expectedScheduleDetailBeforeTransfer
        );
        await eNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            escrowScheduleIds[0],
            50,
            '0x'
          );
        const supplierScheduleDetailAfterTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );
        const investor1ScheduleDetailAfterTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            investor1,
            escrowScheduleIds[0]
          );

        const expectedSupplierScheduleDetailAfterTransfer = {
          tokenHolder: supplier,
          scheduleTokenId: escrowScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(escrowedAmount / 2),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        const expectedInvestor1ScheduleDetailAfterTransfer = {
          tokenHolder: investor1,
          scheduleTokenId: escrowScheduleIds[0],
          startTime: BigNumber.from(NOW),
          endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
          balance: BigNumber.from(escrowedAmount / 2),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        compareEscrowScheduleDetailForAddressStructs(
          supplierScheduleDetailAfterTransfer,
          expectedSupplierScheduleDetailAfterTransfer
        );
        compareEscrowScheduleDetailForAddressStructs(
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
            escrowScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestEscrowedNORI({
          removalDataToList,
        });
        const { eNori, hre, escrowScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const escrowedAmount = removalDataToList[0].amount;
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: [escrowedAmount],
        });
        const supplierScheduleDetailBeforeTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );
        compareEscrowScheduleDetailForAddressStructs(
          supplierScheduleDetailBeforeTransfer,
          {
            startTime: BigNumber.from(NOW),
            endTime: BigNumber.from(NOW).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(escrowedAmount),
          }
        );
        const scheduleSummaryBeforeTransfer =
          await eNori.getEscrowScheduleSummary(escrowScheduleIds[0]);
        compareEscrowScheduleSummaryStructs(scheduleSummaryBeforeTransfer, {
          tokenHolders: [supplier],
        });
        await eNori
          .connect(hre.namedSigners.supplier)
          .safeTransferFrom(
            supplier,
            investor1,
            escrowScheduleIds[0],
            escrowedAmount,
            '0x'
          );
        const supplierScheduleDetailAfterTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            supplier,
            escrowScheduleIds[0]
          );
        const investor1ScheduleDetailAfterTransfer =
          await eNori.getEscrowScheduleDetailForAccount(
            investor1,
            escrowScheduleIds[0]
          );
        const scheduleSummaryAfterTransfer =
          await eNori.getEscrowScheduleSummary(escrowScheduleIds[0]);

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
          balance: BigNumber.from(escrowedAmount),
          claimableAmount: BigNumber.from(0),
          claimedAmount: BigNumber.from(0),
          quantityRevoked: BigNumber.from(0),
          exists: true,
        };
        compareEscrowScheduleDetailForAddressStructs(
          supplierScheduleDetailAfterTransfer,
          expectedSupplierScheduleDetailAfterTransfer
        );
        compareEscrowScheduleDetailForAddressStructs(
          investor1ScheduleDetailAfterTransfer,
          expectedInvestor1ScheduleDetailAfterTransfer
        );
        compareEscrowScheduleSummaryStructs(scheduleSummaryAfterTransfer, {
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
        const { eNori, hre, escrowScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const escrowedAmounts = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: escrowedAmounts,
        });
        // just to make the claimable balances easily computable
        advanceTime({ hre, timestamp: UNIX_EPOCH_2019 + SECONDS_IN_10_YEARS });
        const supplierScheduleDetailsBeforeTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(supplier);

        const expectedScheduleDetailsBeforeTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[0],
            startTime: BigNumber.from(UNIX_EPOCH_2018),
            endTime: BigNumber.from(UNIX_EPOCH_2018).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(escrowedAmounts[0]),
            claimableAmount: BigNumber.from(escrowedAmounts[0]),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[1],
            startTime: BigNumber.from(UNIX_EPOCH_2019),
            endTime: BigNumber.from(UNIX_EPOCH_2019).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(escrowedAmounts[1]),
            claimableAmount: BigNumber.from(escrowedAmounts[1]),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
        ];
        for (const [
          index,
          scheduleDetail,
        ] of supplierScheduleDetailsBeforeTransfer.entries()) {
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedScheduleDetailsBeforeTransfer[index]
          );
        }
        const amountToTransferFirstSchedule = 20;
        const amountToTransferSecondSchedule = 30;

        await eNori
          .connect(hre.namedSigners.supplier)
          .safeBatchTransferFrom(
            supplier,
            investor1,
            escrowScheduleIds,
            [amountToTransferFirstSchedule, amountToTransferSecondSchedule],
            '0x'
          );
        const supplierScheduleDetailsAfterTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(investor1);

        const expectedSupplierScheduleDetailsAfterTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[0],
            startTime: BigNumber.from(UNIX_EPOCH_2018),
            endTime: BigNumber.from(UNIX_EPOCH_2018).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(
              escrowedAmounts[0] - amountToTransferFirstSchedule
            ),
            claimableAmount: BigNumber.from(
              escrowedAmounts[0] - amountToTransferFirstSchedule
            ),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[1],
            startTime: BigNumber.from(UNIX_EPOCH_2019),
            endTime: BigNumber.from(UNIX_EPOCH_2019).add(SECONDS_IN_10_YEARS),
            balance: BigNumber.from(
              escrowedAmounts[1] - amountToTransferSecondSchedule
            ),
            claimableAmount: BigNumber.from(
              escrowedAmounts[1] - amountToTransferSecondSchedule
            ),
            claimedAmount: BigNumber.from(0),
            quantityRevoked: BigNumber.from(0),
            exists: true,
          },
        ];
        const expectedInvestor1ScheduleDetailsAfterTransfer = [
          {
            tokenHolder: investor1,
            scheduleTokenId: escrowScheduleIds[0],
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
            scheduleTokenId: escrowScheduleIds[1],
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
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedSupplierScheduleDetailsAfterTransfer[index]
          );
        }

        for (const [
          index,
          scheduleDetail,
        ] of investor1ScheduleDetailsAfterTransfer.entries()) {
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedInvestor1ScheduleDetailsAfterTransfer[index]
          );
        }
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          eNori.getScheduleIdsForAccount(supplier),
          eNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(supplierScheduleSetAfterTransfer).to.have.deep.members(
          escrowScheduleIds
        );
        expect(investorScheduleSetAfterTransfer).to.have.deep.members(
          escrowScheduleIds
        );
      });

      it('should transfer the full balance of multiple token types to another account', async () => {
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
        const { eNori, hre, escrowScheduleIds } = testSetup;
        const { supplier, investor1 } = hre.namedAccounts;
        const escrowedAmounts = removalDataToList.map(
          (removalData) => removalData.amount
        );
        await sendRemovalProceedsToEscrow({
          testSetup,
          listedRemovalData: removalDataToList,
          removalAmountsToEscrow: escrowedAmounts,
        });
        const supplierScheduleDetailsBeforeTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(supplier);

        const expectedScheduleDetailsBeforeTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[0],
            balance: BigNumber.from(escrowedAmounts[0]),
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[1],
            balance: BigNumber.from(escrowedAmounts[1]),
          },
        ];
        for (const [
          index,
          scheduleDetail,
        ] of supplierScheduleDetailsBeforeTransfer.entries()) {
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedScheduleDetailsBeforeTransfer[index]
          );
        }

        await eNori
          .connect(hre.namedSigners.supplier)
          .safeBatchTransferFrom(
            supplier,
            investor1,
            escrowScheduleIds,
            [escrowedAmounts[0], escrowedAmounts[0]],
            '0x'
          );
        const supplierScheduleDetailsAfterTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(supplier);
        const investor1ScheduleDetailsAfterTransfer =
          await eNori.batchGetEscrowScheduleDetailsForAccount(investor1);

        const expectedSupplierScheduleDetailsAfterTransfer = [
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[0],
            balance: BigNumber.from(0),
          },
          {
            tokenHolder: supplier,
            scheduleTokenId: escrowScheduleIds[1],
            balance: BigNumber.from(0),
          },
        ];
        const expectedInvestor1ScheduleDetailsAfterTransfer = [
          {
            tokenHolder: investor1,
            scheduleTokenId: escrowScheduleIds[0],
            balance: BigNumber.from(escrowedAmounts[0]),
          },
          {
            tokenHolder: investor1,
            scheduleTokenId: escrowScheduleIds[1],
            balance: BigNumber.from(escrowedAmounts[1]),
          },
        ];

        for (const [
          index,
          scheduleDetail,
        ] of supplierScheduleDetailsAfterTransfer.entries()) {
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedSupplierScheduleDetailsAfterTransfer[index]
          );
        }

        for (const [
          index,
          scheduleDetail,
        ] of investor1ScheduleDetailsAfterTransfer.entries()) {
          compareEscrowScheduleDetailForAddressStructs(
            scheduleDetail,
            expectedInvestor1ScheduleDetailsAfterTransfer[index]
          );
        }
        const scheduleSummariesAfterTransfer =
          await eNori.batchGetEscrowScheduleSummaries(escrowScheduleIds);

        for (const scheduleSummary of scheduleSummariesAfterTransfer) {
          compareEscrowScheduleSummaryStructs(scheduleSummary, {
            tokenHolders: [investor1],
          });
        }
        const [
          supplierScheduleSetAfterTransfer,
          investorScheduleSetAfterTransfer,
        ] = await Promise.all([
          eNori.getScheduleIdsForAccount(supplier),
          eNori.getScheduleIdsForAccount(investor1),
        ]);
        expect(supplierScheduleSetAfterTransfer.length).to.equal(0);
        expect(investorScheduleSetAfterTransfer).to.have.deep.members(
          escrowScheduleIds
        );
      });
    });
  });
  describe('failure', () => {
    it('should not allow an account with DEFAULT_ADMIN_ROLE or ESCROW_CREATOR_ROLE to transfer tokens', async () => {
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
      const { eNori, hre, escrowScheduleIds } = testSetup;
      const { supplier, investor1 } = hre.namedAccounts;
      const escrowedAmount = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [escrowedAmount],
      });
      await expect(
        eNori
          .connect(hre.namedSigners.admin)
          .safeTransferFrom(supplier, investor1, escrowScheduleIds[0], 50, '0x')
      ).to.be.revertedWith('OperatorActionsNotSupported()');
    });
  });
});
