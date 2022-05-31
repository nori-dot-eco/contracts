import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';

import type { EscrowedNORI } from '@/typechain-types/EscrowedNORI';
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
  Awaited<ReturnType<typeof setupTest>> & { listedRemovalIds: BigNumber[] }
> => {
  const { hre, contracts, removal, fifoMarket, eNori, ...rest } =
    await setupTest();
  let tokenIds: BigNumber[] = [];
  if (removalDataToList.length > 0) {
    const { supplier } = hre.namedAccounts;
    const defaultStartingVintage = 2016;
    tokenIds = await Promise.all(
      removalDataToList.map((removalData, index) => {
        return createRemovalTokenId(removal, {
          supplierAddress: removalData.supplier ?? supplier,
          vintage: removalData.vintage ?? defaultStartingVintage + index,
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
  return {
    hre,
    contracts,
    listedRemovalIds: tokenIds,
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
}): Promise<EscrowedNORI.EscrowScheduleDetailStructOutput[]> => {
  const { namedAccounts } = hre;
  const { eNori, bpNori, listedRemovalIds } = testSetup;
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
    listedRemovalData.map((_, index) =>
      eNori.getEscrowSchedule(
        listedRemovalData[index].supplier ?? namedAccounts.supplier,
        listedRemovalData[index].escrowScheduleStartTime
      )
    )
  );
  return escrowScheduleDetails;
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
      const { bpNori, eNori, listedRemovalIds, hre } = await setupTestLocal({
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
      const escrowScheduleDetail = await eNori.getEscrowSchedule(
        namedAccounts.supplier,
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetail.currentAmount).equals(escrowedAmount);
      expect(escrowScheduleDetail.recipient).equals(namedAccounts.supplier);
      expect(escrowScheduleDetail.startTime).equals(UNIX_EPOCH_2021);
      expect(escrowScheduleDetail.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_10_YEARS
      );
      expect(escrowScheduleDetail.claimedAmount).equals(0);
      expect(escrowScheduleDetail.totalQuantityRevoked).equals(0);
      expect(escrowScheduleDetail.exists).equals(true);
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
      const { eNori, hre } = testSetup;
      const removalAmountsToEscrow = removalDataToList.map(
        (removalData) => removalData.amount
      );
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow,
      });
      const claimableBalanceOf = await eNori.claimableBalanceOf(
        hre.namedAccounts.supplier
      );
      expect(claimableBalanceOf).to.equal(0);
      await expect(
        eNori
          .connect(await hre.ethers.getSigner(hre.namedAccounts.supplier))
          .withdrawTo(hre.namedAccounts.supplier, removalAmountsToEscrow[0])
      ).revertedWith('InsufficientBalance');
    });
    it('should return the full amount at the end of the escrow schedule', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
        {
          amount: 100,
          vintage: 2019,
          escrowScheduleStartTime: UNIX_EPOCH_2018 + SECONDS_IN_1_YEAR_AVG,
        },
        {
          amount: 100,
          vintage: 2020,
          escrowScheduleStartTime: UNIX_EPOCH_2018 + 2 * SECONDS_IN_1_YEAR_AVG,
        },
      ];
      const testSetup = await setupTestLocal({
        removalDataToList,
      });
      const { eNori, hre } = testSetup;
      const removalAmountsToEscrow = removalDataToList.map(
        (removalData) => removalData.amount
      );
      const totalEscrowedAmount = removalAmountsToEscrow.reduce(
        (a, b) => a + b,
        0
      );
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow,
      });
      await advanceTime({
        hre,
        timestamp:
          UNIX_EPOCH_2018 + 2 * SECONDS_IN_1_YEAR_AVG + SECONDS_IN_10_YEARS,
      });
      const claimableBalanceOf = await eNori.claimableBalanceOf(
        hre.namedAccounts.supplier
      );
      expect(claimableBalanceOf).to.equal(totalEscrowedAmount);
      await eNori
        .connect(await hre.ethers.getSigner(hre.namedAccounts.supplier))
        .withdrawTo(hre.namedAccounts.supplier, totalEscrowedAmount);
    }, 60_000);
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
      const { eNori, hre } = testSetup;
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
      const originalClaimableBalanceOf = await eNori.claimableBalanceOf(
        hre.namedAccounts.supplier
      );
      expect(originalClaimableBalanceOf).to.equal(
        removalDataToList[0].amount / 2
      );
      const secondAmountToEscrow = removalDataToList[1].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: [removalDataToList[1]],
        removalAmountsToEscrow: [secondAmountToEscrow],
      });
      const claimableBalanceAfterSecondEscrowing =
        await eNori.claimableBalanceOf(hre.namedAccounts.supplier);
      expect(claimableBalanceAfterSecondEscrowing).to.equal(
        removalDataToList[0].amount / 2 + removalDataToList[1].amount / 2
      );
    });
  });
  describe('Claiming (withdrawTo)', () => {
    it("should allow withdrawal and claimed tokens should be correctly distributed across a supplier's schedules", async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
        {
          amount: 100,
          vintage: 2019,
          escrowScheduleStartTime: UNIX_EPOCH_2018 + SECONDS_IN_1_YEAR_AVG,
        },
        {
          amount: 100,
          vintage: 2020,
          escrowScheduleStartTime: UNIX_EPOCH_2018 + 2 * SECONDS_IN_1_YEAR_AVG,
        },
      ];
      const testSetup = await setupTestLocal({
        removalDataToList,
      });
      const { eNori, bpNori, hre } = testSetup;
      const removalAmountsToEscrow = removalDataToList.map(
        (removalData) => removalData.amount
      ); // escrow full removal balances
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow,
      });
      await advanceTime({
        hre,
        timestamp: UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
      });
      const expectedClaimableBalance2018Schedule =
        (5 / 10) * removalDataToList[0].amount;
      const expectedClaimableBalance2019Schedule =
        (4 / 10) * removalDataToList[1].amount;
      const expectedClaimableBalance2020Schedule =
        (3 / 10) * removalDataToList[2].amount;

      const expectedClaimableBalance =
        expectedClaimableBalance2018Schedule +
        expectedClaimableBalance2019Schedule +
        expectedClaimableBalance2020Schedule;

      const { supplier } = hre.namedAccounts;
      const retrievedClaimableBalance = await eNori.claimableBalanceOf(
        supplier
      );
      expect(retrievedClaimableBalance).to.equal(expectedClaimableBalance);
      expect(
        await eNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawTo(supplier, retrievedClaimableBalance)
      )
        .to.emit(eNori, 'TokensClaimed')
        .withArgs(supplier, supplier, retrievedClaimableBalance)
        .to.emit(eNori, 'Burned')
        .withArgs(supplier, supplier, retrievedClaimableBalance, '0x', '0x')
        .to.emit(eNori, 'Transfer')
        .withArgs(
          supplier,
          hre.ethers.constants.AddressZero,
          retrievedClaimableBalance
        )
        .to.emit(bpNori, 'Sent')
        .withArgs(
          eNori.address,
          eNori.address,
          supplier,
          retrievedClaimableBalance,
          '0x',
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(eNori.address, supplier, retrievedClaimableBalance);
      const escrowScheduleDetails = await eNori.batchGetEscrowSchedules([
        supplier,
      ]);
      const escrowSchedule2018 = escrowScheduleDetails[0];
      const escrowSchedule2019 = escrowScheduleDetails[1];
      const escrowSchedule2020 = escrowScheduleDetails[2];
      expect(escrowSchedule2018.claimedAmount).to.equal(
        expectedClaimableBalance2018Schedule
      );
      expect(escrowSchedule2019.claimedAmount).to.equal(
        expectedClaimableBalance2019Schedule
      );
      expect(escrowSchedule2020.claimedAmount).to.equal(
        expectedClaimableBalance2020Schedule
      );
      const claimableBalanceAfterWithdrawal = await eNori.claimableBalanceOf(
        supplier
      );
      expect(claimableBalanceAfterWithdrawal).to.equal(0);
    });
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
      const { eNori, bpNori, hre } = testSetup;
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
      const claimableBalance = await eNori.claimableBalanceOf(supplier);
      expect(
        await eNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawTo(investor1, claimableBalance)
      )
        .to.emit(eNori, 'TokensClaimed')
        .withArgs(supplier, investor1, claimableBalance);

      expect(await eNori.totalSupply()).to.equal(
        BigNumber.from(amountToEscrow).sub(claimableBalance)
      );
      expect(await eNori.balanceOf(supplier)).to.equal(
        BigNumber.from(amountToEscrow).sub(claimableBalance)
      );
      expect(await eNori.claimableBalanceOf(supplier)).to.equal(0);
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
      const { eNori, hre } = testSetup;
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
      const claimableBalance = await eNori.claimableBalanceOf(supplier);
      const attemptToWithdrawAmount = claimableBalance.add(1);
      await expect(
        eNori
          .connect(await hre.ethers.getSigner(supplier))
          .withdrawTo(supplier, attemptToWithdrawAmount)
      ).to.be.revertedWith('InsufficientBalance');
    });
  });
  describe('Revoking (batchRevokeUnreleasedTokenAmounts)', () => {
    it('should revoke a specific number of tokens, emit events, and account for the quantity revoked', async () => {
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

      const { eNori, bpNori, hre, listedRemovalIds } = testSetup;
      const { supplier, admin } = hre.namedAccounts;
      const originalAdminBpNoriBalance = await bpNori.balanceOf(admin);
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
      const originalRevocableQuantity = await eNori.revocableQuantity(
        supplier,
        UNIX_EPOCH_2018
      );
      expect(originalRevocableQuantity).to.equal(amountToEscrow / 2);
      expect(
        await eNori.batchRevokeUnreleasedTokenAmounts(
          [supplier],
          listedRemovalIds,
          [originalRevocableQuantity]
        )
      )
        .to.emit(eNori, 'UnreleasedTokensRevoked')
        .withArgs(
          UNIX_EPOCH_2018 + SECONDS_IN_5_YEARS,
          listedRemovalIds[0],
          UNIX_EPOCH_2018,
          originalRevocableQuantity
        )
        .to.emit(eNori, 'Burned')
        .withArgs(admin, supplier, originalRevocableQuantity, '0x', '0x')
        .to.emit(eNori, 'Transfer')
        .withArgs(
          supplier,
          hre.ethers.constants.AddressZero,
          originalRevocableQuantity
        )
        .to.emit(bpNori, 'Sent') // todo are these bpNori events actually getting emitted?
        .withArgs(
          eNori.address,
          eNori.address,
          admin,
          originalRevocableQuantity,
          '0x',
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(eNori.address, admin, originalRevocableQuantity);

      expect(await eNori.revocableQuantity(supplier, UNIX_EPOCH_2018)).to.equal(
        0
      );
      const newBalance = BigNumber.from(amountToEscrow).sub(
        originalRevocableQuantity
      );
      const escrowScheduleDetail = await eNori.getEscrowSchedule(
        supplier,
        UNIX_EPOCH_2018
      );
      expect(escrowScheduleDetail.totalQuantityRevoked).to.equal(
        originalRevocableQuantity
      );
      expect(escrowScheduleDetail.currentAmount).to.equal(newBalance);
      expect(await eNori.balanceOf(supplier)).to.equal(newBalance);
      expect(await eNori.totalSupply()).to.equal(newBalance);
      // todo examine the bpNori admin balance?
    });
  });

  describe('Disabled functions', () => {
    it('should fail to *send*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({ removalDataToList });
      const { eNori, bpNori, hre } = testSetup;
      const amountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [amountToEscrow],
      });
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      await expect(
        eNori.connect(supplierSigner).send(investor1, 1, '0x')
      ).to.be.revertedWith('SendDisabled');
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      expect(await eNori.totalSupply()).to.equal(amountToEscrow);
      expect(await bpNori.balanceOf(supplier)).to.equal(0);
    });

    it('should fail to *transfer*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({ removalDataToList });
      const { eNori, bpNori, hre } = testSetup;
      const amountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [amountToEscrow],
      });
      const { supplier, investor1 } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      await expect(
        eNori.connect(supplierSigner).transfer(investor1, 1)
      ).to.be.revertedWith('TransferDisabled');
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      expect(await eNori.totalSupply()).to.equal(amountToEscrow);
      expect(await bpNori.balanceOf(supplier)).to.equal(0);
    });

    it('Should fail to *operatorSend*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({ removalDataToList });
      const { eNori, bpNori, hre } = testSetup;
      const amountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [amountToEscrow],
      });
      const { supplier, investor1, admin } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      await expect(
        eNori.connect(supplierSigner).authorizeOperator(admin)
      ).to.be.revertedWith('OperatorActionsDisabled');
      await expect(
        eNori
          .connect(supplierSigner)
          .operatorSend(supplier, investor1, 1, '0x', '0x')
      ).to.be.revertedWith('OperatorSendDisabled');
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      expect(await eNori.totalSupply()).to.equal(amountToEscrow);
      expect(await bpNori.balanceOf(supplier)).to.equal(0);
    });

    it('Should fail to *transferFrom*', async () => {
      const removalDataToList = [
        {
          amount: 100,
          vintage: 2018,
          escrowScheduleStartTime: UNIX_EPOCH_2018,
        },
      ];
      const testSetup = await setupTestLocal({ removalDataToList });
      const { eNori, bpNori, hre } = testSetup;
      const amountToEscrow = removalDataToList[0].amount;
      await sendRemovalProceedsToEscrow({
        testSetup,
        listedRemovalData: removalDataToList,
        removalAmountsToEscrow: [amountToEscrow],
      });
      const { supplier, investor1, admin } = await hre.getNamedAccounts();
      const supplierSigner = await hre.ethers.getSigner(supplier);
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      await expect(
        eNori.connect(supplierSigner).approve(admin, 1)
      ).to.be.revertedWith('OperatorActionsDisabled');
      await expect(
        eNori.connect(supplierSigner).transferFrom(supplier, investor1, 1)
      ).to.be.revertedWith('TransferFromDisabled');
      expect(await eNori.balanceOf(supplier)).to.equal(amountToEscrow);
      expect(await eNori.totalSupply()).to.equal(amountToEscrow);
      expect(await bpNori.balanceOf(supplier)).to.equal(0);
    });
  });
});
