import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';

import type { EscrowedNORI } from '@/typechain-types/contracts/EscrowedNORI';
import {
  expect,
  setupTest,
  advanceTime,
  getLatestBlockTime,
  createRemovalTokenId,
  createEscrowScheduleStartTimeArray,
  mockDepositNoriToPolygon,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

const NOW = Math.floor(Date.now() / 1000);
const UNIX_EPOCH_2018 = 1_514_793_600;
const UNIX_EPOCH_2019 = 1_546_329_600;
const UNIX_EPOCH_2020 = 1_577_865_600;
const UNIX_EPOCH_2021 = 1_609_488_000;
const UNIX_EPOCH_2023 = 1_672_560_000;
const SECONDS_IN_1_YEAR_AVG = 31_556_952;
const SECONDS_IN_10_YEARS = 315_569_520;
const SECONDS_IN_5_YEARS = SECONDS_IN_10_YEARS / 2;

const setupTestLocal = async ({
  removalDataToList = [],
}: {
  buyerInitialBPNoriBalance?: BigNumberish;
  removalDataToList?: {
    amount: number;
    escrowScheduleStartTime: number;
    vintage?: number;
    supplier?: string;
  }[];
}): Promise<
  Awaited<ReturnType<typeof setupTest>> & {
    listedRemovalIds: BigNumber[];
    escrowScheduleIds: BigNumber[];
  }
> => {
  const { hre, contracts, removal, fifoMarket, eNori, ...rest } =
    await setupTest();
  let tokenIds: BigNumber[] = [];
  if (removalDataToList.length > 0) {
    const { supplier } = hre.namedAccounts;
    const defaultStartingVintage = 2016;
    tokenIds = await Promise.all(
      removalDataToList.map((removalData, index) => {
        return createRemovalTokenId({
          removal,
          hre,
          removalData: {
            supplierAddress: removalData.supplier ?? supplier,
            vintage: removalData.vintage ?? defaultStartingVintage + index,
          },
        });
      })
    );
    const escrowScheduleStartTimes: BigNumber[] = removalDataToList.map(
      (removalData) =>
        // TODO you might want to add a 0 case here where the escrowScheduleStartTime remains 0
        // to be able to test cases where the removalId basically has an empty entry for this
        BigNumber.from(removalData.escrowScheduleStartTime)
    );
    const removalBalances = removalDataToList.map((removalData) =>
      hre.ethers.utils.parseUnits(removalData.amount.toString())
    );

    const packedData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'bool'],
      [fifoMarket.address, true]
    );
    expect(
      await removal.mintRemovalBatch(
        supplier,
        removalBalances,
        tokenIds,
        escrowScheduleStartTimes,
        packedData
      )
    ).to.emit(eNori, 'EscrowScheduleCreated');
  }

  const escrowScheduleIds = await Promise.all(
    tokenIds.map((removalId) => eNori.removalIdToScheduleId(removalId))
  );

  return {
    hre,
    contracts,
    listedRemovalIds: tokenIds,
    escrowScheduleIds,
    removal,
    fifoMarket,
    eNori,
    ...rest,
  };
};

// TODO  do we even need to do this if it's just one value being sent?
const formatTokensReceivedUserData = (removalId: BigNumber): any => {
  return hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [removalId]);
};

const sendRemovalProceedsToEscrow = async ({
  testSetup,
  listedRemovalData,
  removalAmountsToEscrow,
}: {
  testSetup: Awaited<ReturnType<typeof setupTestLocal>>;
  listedRemovalData: {
    amount: number;
    escrowScheduleStartTime: number;
    vintage?: number;
    supplier?: string;
  }[];
  removalAmountsToEscrow: number[];
}): Promise<any> => {
  // todo where is EscrowScheduleSummaryStructOutput?
  const { eNori, bpNori, listedRemovalIds, escrowScheduleIds } = testSetup;
  await Promise.all(
    listedRemovalData.map((_, index) => {
      const userData = formatTokensReceivedUserData(listedRemovalIds[index]);
      return bpNori.send(
        eNori.address,
        removalAmountsToEscrow[index],
        userData
      );
    })
  );

  const escrowScheduleDetails = await Promise.all(
    escrowScheduleIds.map((id) => eNori.getEscrowScheduleSummary(id))
  );
  return escrowScheduleDetails;
};

const compareEscrowScheduleDetailForAddressStructs = (
  receivedScheduleDetail: EscrowedNORI.EscrowScheduleDetailForAddressStruct,
  expectedScheduleDetail: EscrowedNORI.EscrowScheduleDetailForAddressStruct
): void => {
  expect(receivedScheduleDetail.tokenHolder).to.equal(
    expectedScheduleDetail.tokenHolder
  );
  expect(receivedScheduleDetail.scheduleTokenId).to.equal(
    expectedScheduleDetail.scheduleTokenId
  );
  expect(receivedScheduleDetail.startTime).to.equal(
    expectedScheduleDetail.startTime
  );
  expect(receivedScheduleDetail.endTime).to.equal(
    expectedScheduleDetail.endTime
  );
  expect(receivedScheduleDetail.balance).to.equal(
    expectedScheduleDetail.balance
  );
  expect(receivedScheduleDetail.claimableAmount).to.equal(
    expectedScheduleDetail.claimableAmount
  );
  expect(receivedScheduleDetail.claimedAmount).to.equal(
    expectedScheduleDetail.claimedAmount
  );
  expect(receivedScheduleDetail.quantityRevoked).to.equal(
    expectedScheduleDetail.quantityRevoked
  );
  expect(receivedScheduleDetail.exists).to.equal(expectedScheduleDetail.exists);
};

const compareEscrowScheduleSummaryStructs = (
  receivedScheduleSummary: EscrowedNORI.EscrowScheduleSummaryStruct,
  expectedScheduleSummary: EscrowedNORI.EscrowScheduleSummaryStruct
): void => {
  expect(receivedScheduleSummary.scheduleTokenId).to.equal(
    expectedScheduleSummary.scheduleTokenId
  );
  expect(receivedScheduleSummary.startTime).to.equal(
    expectedScheduleSummary.startTime
  );
  expect(receivedScheduleSummary.endTime).to.equal(
    expectedScheduleSummary.endTime
  );
  expect(receivedScheduleSummary.totalSupply).to.equal(
    expectedScheduleSummary.totalSupply
  );
  expect(receivedScheduleSummary.totalClaimableAmount).to.equal(
    expectedScheduleSummary.totalClaimableAmount
  );
  expect(receivedScheduleSummary.totalClaimedAmount).to.equal(
    expectedScheduleSummary.totalClaimedAmount
  );
  expect(receivedScheduleSummary.totalQuantityRevoked).to.equal(
    expectedScheduleSummary.totalQuantityRevoked
  );
  expect(receivedScheduleSummary.exists).to.equal(
    expectedScheduleSummary.exists
  );
  for (const [
    index,
    holder,
  ] of receivedScheduleSummary.tokenHolders.entries()) {
    expect(holder).to.equal(expectedScheduleSummary.tokenHolders[index]);
  }
};

describe('EscrowedNORI', () => {
  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      for (const { role, expectedCount } of [
        { role: 'DEFAULT_ADMIN_ROLE', expectedCount: 1 },
        { role: 'PAUSER_ROLE', expectedCount: 1 },
        { role: 'ESCROW_CREATOR_ROLE', expectedCount: 2 }, // Removal contract is an escrow creator
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
  describe('tokensReceived', () => {
    it('should deposit tokens and automatically create a new escrow schedule where one does not exist', async () => {
      const removalDataToList = [
        { amount: 5, vintage: 2018, escrowScheduleStartTime: UNIX_EPOCH_2021 },
      ];
      const { bpNori, eNori, listedRemovalIds, escrowScheduleIds, hre } =
        await setupTestLocal({
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
  describe('Transferring', () => {
    describe('safeTransferFrom', () => {
      // eslint-disable-next-line jest/expect-expect -- assertions are in helper function
      it('should transfer tokens to another account', async () => {
        const removalDataToList = [
          {
            amount: 100,
            vintage: 2018,
            escrowScheduleStartTime: NOW,
          },
        ];
        const testSetup = await setupTestLocal({
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
        // console.log(supplierScheduleDetailAfterTransfer);

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
    });
    describe('safeBatchTransferFrom', () => {
      // eslint-disable-next-line jest/expect-expect -- assertions are in helper function
      it('should transfer multiple tokens to another account', async () => {
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
        const testSetup = await setupTestLocal({
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
      });
    });
  });
  describe('Linear releasing (claimableBalanceOf)', () => {
    it('should return 0 before schedule start time', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2020,
          escrowScheduleStartTime: UNIX_EPOCH_2023,
        },
      ];
      const testSetup = await setupTestLocal({
        removalDataToList,
      });
      const { eNori, hre, escrowScheduleIds } = testSetup;
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
          .connect(await hre.ethers.getSigner(hre.namedAccounts.supplier))
          .withdrawFromEscrowSchedule(
            hre.namedAccounts.supplier,
            escrowScheduleIds[0],
            removalAmountsToEscrow[0]
          )
      ).revertedWith('InsufficientBalance');
    });
    it('should return the full amount at the end of the escrow schedule', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({
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
      const testSetup = await setupTestLocal({
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
    // it("should allow withdrawal and claimed tokens should be correctly distributed across a supplier's schedules", async () => {
    //   const removalDataToList = [
    //     {
    //       amount: 100,
    //       vintage: 2018,
    //       escrowScheduleStartTime: UNIX_EPOCH_2018,
    //     },
    //     {
    //       amount: 100,
    //       vintage: 2019,
    //       escrowScheduleStartTime: UNIX_EPOCH_2018 + SECONDS_IN_1_YEAR_AVG,
    //     },
    //     {
    //       amount: 100,
    //       vintage: 2020,
    //       escrowScheduleStartTime: UNIX_EPOCH_2018 + 2 * SECONDS_IN_1_YEAR_AVG,
    //     },
    //   ];
    //   const testSetup = await setupTestLocal({
    //     removalDataToList,
    //   });
    //   const { eNori, bpNori, hre } = testSetup;
    //   const removalAmountsToEscrow = removalDataToList.map(
    //     (removalData) => removalData.amount
    //   ); // escrow full removal balances
    //   await sendRemovalProceedsToEscrow({
    //     testSetup,
    //     listedRemovalData: removalDataToList,
    //     removalAmountsToEscrow,
    //   });
    //   await advanceTime({
    //     hre,
    //     timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
    //   });
    //   const expectedClaimableBalance2018Schedule =
    //     (5 / 10) * removalDataToList[0].amount;
    //   const expectedClaimableBalance2019Schedule =
    //     (4 / 10) * removalDataToList[1].amount;
    //   const expectedClaimableBalance2020Schedule =
    //     (3 / 10) * removalDataToList[2].amount;

    //   const expectedClaimableBalance =
    //     expectedClaimableBalance2018Schedule +
    //     expectedClaimableBalance2019Schedule +
    //     expectedClaimableBalance2020Schedule;

    //   const { supplier } = hre.namedAccounts;
    //   const retrievedClaimableBalance = await eNori.claimableBalanceOf(
    //     supplier
    //   );
    //   expect(retrievedClaimableBalance).to.equal(expectedClaimableBalance);
    //   expect(
    //     await eNori
    //       .connect(await hre.ethers.getSigner(supplier))
    //       .withdrawTo(supplier, retrievedClaimableBalance)
    //   )
    //     .to.emit(eNori, 'TokensClaimed')
    //     .withArgs(supplier, supplier, retrievedClaimableBalance)
    //     .to.emit(eNori, 'Burned')
    //     .withArgs(supplier, supplier, retrievedClaimableBalance, '0x', '0x')
    //     .to.emit(eNori, 'Transfer')
    //     .withArgs(
    //       supplier,
    //       hre.ethers.constants.AddressZero,
    //       retrievedClaimableBalance
    //     )
    //     .to.emit(bpNori, 'Sent')
    //     .withArgs(
    //       eNori.address,
    //       eNori.address,
    //       supplier,
    //       retrievedClaimableBalance,
    //       '0x',
    //       '0x'
    //     )
    //     .to.emit(bpNori, 'Transfer')
    //     .withArgs(eNori.address, supplier, retrievedClaimableBalance);
    //   const escrowScheduleDetails = await eNori.batchGetEscrowSchedules([
    //     supplier,
    //   ]);
    //   const escrowSchedule2018 = escrowScheduleDetails[0];
    //   const escrowSchedule2019 = escrowScheduleDetails[1];
    //   const escrowSchedule2020 = escrowScheduleDetails[2];
    //   expect(escrowSchedule2018.claimedAmount).to.equal(
    //     expectedClaimableBalance2018Schedule
    //   );
    //   expect(escrowSchedule2019.claimedAmount).to.equal(
    //     expectedClaimableBalance2019Schedule
    //   );
    //   expect(escrowSchedule2020.claimedAmount).to.equal(
    //     expectedClaimableBalance2020Schedule
    //   );
    //   const claimableBalanceAfterWithdrawal = await eNori.claimableBalanceOf(
    //     supplier
    //   );
    //   expect(claimableBalanceAfterWithdrawal).to.equal(0);
    // });
    it('can withdraw to a different address from the escrow schedule holder', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({
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
        .withArgs(supplier, investor1, claimableBalance);

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
      expect(await bpNori.totalSupply()).to.equal(bpNoriSupplyBeforeWithdrawl);
      expect(await bpNori.balanceOf(supplier)).to.equal(0);
      expect(await bpNori.balanceOf(investor1)).to.equal(claimableBalance);
    });
    it('should revert when attempting to withdraw more tokens than are available to claim', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({
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
      ).to.be.revertedWith('InsufficientBalance');
    });
  });
  // describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
  //   it('should revoke a specific number of tokens, emit events, and account for the quantity revoked', async () => {
  //     const removalDataToList = [
  //       {
  //         amount: 100,
  //         vintage: 2018,
  //         escrowScheduleStartTime: UNIX_EPOCH_2018,
  //       },
  //     ];
  //     const testSetup = await setupTestLocal({
  //       removalDataToList,
  //     });

  //     const { eNori, bpNori, hre, listedRemovalIds } = testSetup;
  //     const { supplier, admin } = hre.namedAccounts;
  //     const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
  //     const amountToEscrow = removalDataToList[0].amount;
  //     await sendRemovalProceedsToEscrow({
  //       testSetup,
  //       listedRemovalData: removalDataToList,
  //       removalAmountsToEscrow: [amountToEscrow],
  //     });
  //     await advanceTime({
  //       hre,
  //       timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
  //     });
  //     const originalRevocableQuantity = await eNori.revocableQuantity(
  //       supplier,
  //       UNIX_EPOCH_2018
  //     );
  //     expect(originalRevocableQuantity).to.equal(amountToEscrow / 2);
  //     expect(
  //       await eNori.batchRevokeUnreleasedTokenAmounts(
  //         [supplier],
  //         listedRemovalIds,
  //         [originalRevocableQuantity]
  //       )
  //     )
  //       .to.emit(eNori, 'UnreleasedTokensRevoked')
  //       .withArgs(
  //         UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
  //         listedRemovalIds[0],
  //         UNIX_EPOCH_2018,
  //         originalRevocableQuantity
  //       )
  //       .to.emit(eNori, 'Burned')
  //       .withArgs(admin, supplier, originalRevocableQuantity, '0x', '0x')
  //       .to.emit(eNori, 'Transfer')
  //       .withArgs(
  //         supplier,
  //         hre.ethers.constants.AddressZero,
  //         originalRevocableQuantity
  //       )
  //       .to.emit(bpNori, 'Sent') // todo are these bpNori events actually getting emitted? are the args right? what happens if you put somethign blatantly wrong in here, does the test fail?
  //       .withArgs(
  //         eNori.address,
  //         eNori.address,
  //         admin,
  //         originalRevocableQuantity,
  //         '0x',
  //         '0x'
  //       )
  //       .to.emit(bpNori, 'Transfer')
  //       .withArgs(eNori.address, admin, originalRevocableQuantity);

  //     expect(await eNori.revocableQuantity(supplier, UNIX_EPOCH_2018)).to.equal(
  //       0
  //     );
  //     const newBalance = BigNumber.from(amountToEscrow).sub(
  //       originalRevocableQuantity
  //     );
  //     const escrowScheduleDetail = await eNori.getEscrowSchedule(
  //       supplier,
  //       UNIX_EPOCH_2018
  //     );
  //     expect(escrowScheduleDetail.totalQuantityRevoked).to.equal(
  //       originalRevocableQuantity
  //     );
  //     expect(escrowScheduleDetail.currentAmount).to.equal(newBalance);
  //     expect(await eNori.balanceOf(supplier)).to.equal(newBalance);
  //     expect(await eNori.totalSupply()).to.equal(newBalance);
  //     // todo examine the bpNori admin balance?
  //   });
  // });

  // describe('Disabled functions', () => {
  //   it('should fail to *send*', async () => {
  //     const removalDataToList = [
  //       {
  //         amount: 100,
  //         vintage: 2018,
  //         escrowScheduleStartTime: UNIX_EPOCH_2018,
  //       },
  //     ];
  //     const testSetup = await setupTestLocal({ removalDataToList });
  //     const { eNori, bpNori, hre } = testSetup;
  //     const amountToEscrow = removalDataToList[0].amount;
  //     await sendRemovalProceedsToEscrow({
  //       testSetup,
  //       listedRemovalData: removalDataToList,
  //       removalAmountsToEscrow: [amountToEscrow],
  //     });
  //     const { supplier, investor1 } = await hre.getNamedAccounts();
  //     const supplierSigner = await hre.ethers.getSigner(supplier);
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     await expect(
  //       eNori.connect(supplierSigner).send(investor1, 1, '0x')
  //     ).to.be.revertedWith('SendDisabled');
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     expect(await eNori.totalSupply()).to.equal(amountToEscrow);
  //     expect(await bpNori.balanceOf(supplier)).to.equal(0);
  //   });

  //   it('should fail to *transfer*', async () => {
  //     const removalDataToList = [
  //       {
  //         amount: 100,
  //         vintage: 2018,
  //         escrowScheduleStartTime: UNIX_EPOCH_2018,
  //       },
  //     ];
  //     const testSetup = await setupTestLocal({ removalDataToList });
  //     const { eNori, bpNori, hre } = testSetup;
  //     const amountToEscrow = removalDataToList[0].amount;
  //     await sendRemovalProceedsToEscrow({
  //       testSetup,
  //       listedRemovalData: removalDataToList,
  //       removalAmountsToEscrow: [amountToEscrow],
  //     });
  //     const { supplier, investor1 } = await hre.getNamedAccounts();
  //     const supplierSigner = await hre.ethers.getSigner(supplier);
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     await expect(
  //       eNori.connect(supplierSigner).transfer(investor1, 1)
  //     ).to.be.revertedWith('TransferDisabled');
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     expect(await eNori.totalSupply()).to.equal(amountToEscrow);
  //     expect(await bpNori.balanceOf(supplier)).to.equal(0);
  //   });

  //   it('Should fail to *operatorSend*', async () => {
  //     const removalDataToList = [
  //       {
  //         amount: 100,
  //         vintage: 2018,
  //         escrowScheduleStartTime: UNIX_EPOCH_2018,
  //       },
  //     ];
  //     const testSetup = await setupTestLocal({ removalDataToList });
  //     const { eNori, bpNori, hre } = testSetup;
  //     const amountToEscrow = removalDataToList[0].amount;
  //     await sendRemovalProceedsToEscrow({
  //       testSetup,
  //       listedRemovalData: removalDataToList,
  //       removalAmountsToEscrow: [amountToEscrow],
  //     });
  //     const { supplier, investor1, admin } = await hre.getNamedAccounts();
  //     const supplierSigner = await hre.ethers.getSigner(supplier);
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     await expect(
  //       eNori.connect(supplierSigner).authorizeOperator(admin)
  //     ).to.be.revertedWith('OperatorActionsDisabled');
  //     await expect(
  //       eNori
  //         .connect(supplierSigner)
  //         .operatorSend(supplier, investor1, 1, '0x', '0x')
  //     ).to.be.revertedWith('OperatorSendDisabled');
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     expect(await eNori.totalSupply()).to.equal(amountToEscrow);
  //     expect(await bpNori.balanceOf(supplier)).to.equal(0);
  //   });

  //   it('Should fail to *transferFrom*', async () => {
  //     const removalDataToList = [
  //       {
  //         amount: 100,
  //         vintage: 2018,
  //         escrowScheduleStartTime: UNIX_EPOCH_2018,
  //       },
  //     ];
  //     const testSetup = await setupTestLocal({ removalDataToList });
  //     const { eNori, bpNori, hre } = testSetup;
  //     const amountToEscrow = removalDataToList[0].amount;
  //     await sendRemovalProceedsToEscrow({
  //       testSetup,
  //       listedRemovalData: removalDataToList,
  //       removalAmountsToEscrow: [amountToEscrow],
  //     });
  //     const { supplier, investor1, admin } = await hre.getNamedAccounts();
  //     const supplierSigner = await hre.ethers.getSigner(supplier);
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     await expect(
  //       eNori.connect(supplierSigner).approve(admin, 1)
  //     ).to.be.revertedWith('OperatorActionsDisabled');
  //     await expect(
  //       eNori.connect(supplierSigner).transferFrom(supplier, investor1, 1)
  //     ).to.be.revertedWith('TransferFromDisabled');
  //     expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
  //     expect(await eNori.totalSupply()).to.equal(amountToEscrow);
  //     expect(await bpNori.balanceOf(supplier)).to.equal(0);
  //   });
  // });
  describe('full lifecycle', () => {
    it('should successfully walk escrowed tokens through all possible actions', async () => {
      const removalDataToList = [
        {
          amount: 1000,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
        {
          amount: 1000,
          vintage: 2019,
          escrowScheduleStartTime: UNIX_EPOCH_2019,
        },
      ];
      const testSetup = await setupTestLocal({
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

      // move to halfway through the escrow schedule
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
      });
    });
  });
});
