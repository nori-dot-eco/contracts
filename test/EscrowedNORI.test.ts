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

const UNIX_EPOCH_2021 = 1_609_488_000;
const SECONDS_IN_TEN_YEARS = 31_536_000;

const setupTestLocal = async ({
  removalDataToList = [],
}: {
  buyerInitialBPNoriBalance?: BigNumberish;
  removalDataToList?: {
    amount: number;
    vintage?: number;
    supplier?: string;
    escrowScheduleStartTime?: number;
  }[];
}): Promise<
  Awaited<ReturnType<typeof setupTest>> & { listedRemovalIds: BigNumber[] }
> => {
  const { hre, contracts, removal, fifoMarket, ...rest } = await setupTest();
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
    const escrowScheduleStartTimesByVintage =
      await createEscrowScheduleStartTimeArray(removal, tokenIds);
    const escrowScheduleStartTimes: BigNumber[] = removalDataToList.map(
      (removalData, index) => {
        // TODO you might want to add a 0 case here where the escrowScheduleStartTime remains 0
        // to be able to test cases where the removalId basically has an empty entry for this
        if (removalData.escrowScheduleStartTime !== undefined) {
          return BigNumber.from(removalData.escrowScheduleStartTime);
        }
        return escrowScheduleStartTimesByVintage[index];
      }
    );
    const removalBalances = removalDataToList.map((removalData) =>
      hre.ethers.utils.parseUnits(removalData.amount.toString())
    );

    const packedData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'bool'],
      [fifoMarket.address, true]
    );
    await removal.mintRemovalBatch(
      supplier,
      removalBalances,
      tokenIds,
      escrowScheduleStartTimes,
      packedData
    );
  }
  return {
    hre,
    contracts,
    listedRemovalIds: tokenIds,
    removal,
    fifoMarket,
    ...rest,
  };
};

// TODO  do we even need to do this if it's just one value being sent?
const formatTokensReceivedUserData = (removalId: BigNumber): any => {
  return hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [removalId]);
};

describe('EscrowedNORI', () => {
  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      for (const { role } of [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'PAUSER_ROLE' },
        { role: 'ESCROW_CREATOR_ROLE' },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { eNori, hre } = await setupTest();
          expect(
            await eNori.hasRole(await eNori[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await eNori.getRoleAdmin(await eNori[role]())).to.eq(
            await eNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await eNori.getRoleMemberCount(await eNori[role]())).to.eq(1);
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
      // TODO consider rolling this all into a utility
      const { namedAccounts } = hre;
      const escrowedAmount = 1;
      const userData = formatTokensReceivedUserData(listedRemovalIds[0]);
      expect(await bpNori.send(eNori.address, escrowedAmount, userData))
        .to.emit(eNori, 'EscrowScheduleCreated')
        .withArgs(namedAccounts.supplier, UNIX_EPOCH_2021)
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
      // TODO examine the schedule created and see that it looks right
      const escrowScheduleDetail = await eNori.getEscrowSchedule(
        namedAccounts.supplier,
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetail.currentAmount).equals(escrowedAmount);
      expect(escrowScheduleDetail.recipient).equals(namedAccounts.supplier);
      expect(escrowScheduleDetail.startTime).equals(UNIX_EPOCH_2021);
      expect(escrowScheduleDetail.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_TEN_YEARS
      );
      expect(escrowScheduleDetail.claimedAmount).equals(0);
      expect(escrowScheduleDetail.totalQuantityRevoked).equals(0);
      expect(escrowScheduleDetail.exists).equals(true);
    });
    it('should manually create a new escrow schedule and correctly deposit received tokens into it', async () => {
      const removalDataToList = [
        { amount: 5, vintage: 2018, escrowScheduleStartTime: UNIX_EPOCH_2021 },
      ];
      const { bpNori, eNori, listedRemovalIds, hre } = await setupTestLocal({
        removalDataToList,
      });
      const { namedAccounts } = hre;

      expect(
        await eNori.createEscrowSchedule(
          namedAccounts.supplier,
          UNIX_EPOCH_2021
        )
      )
        .to.emit(eNori, 'EscrowScheduleCreated')
        .withArgs(namedAccounts.supplier, UNIX_EPOCH_2021);
      const escrowScheduleDetailBeforeDeposit = await eNori.getEscrowSchedule(
        namedAccounts.supplier,
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetailBeforeDeposit.currentAmount).equals(0);
      expect(escrowScheduleDetailBeforeDeposit.recipient).equals(
        namedAccounts.supplier
      );
      expect(escrowScheduleDetailBeforeDeposit.startTime).equals(
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetailBeforeDeposit.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_TEN_YEARS
      );
      expect(escrowScheduleDetailBeforeDeposit.claimedAmount).equals(0);
      expect(escrowScheduleDetailBeforeDeposit.totalQuantityRevoked).equals(0);
      expect(escrowScheduleDetailBeforeDeposit.exists).equals(true);

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
      // TODO examine the schedule created and see that it looks right
      const escrowScheduleDetailAfterDeposit = await eNori.getEscrowSchedule(
        namedAccounts.supplier,
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetailAfterDeposit.currentAmount).equals(
        escrowedAmount
      );
      expect(escrowScheduleDetailAfterDeposit.recipient).equals(
        namedAccounts.supplier
      );
      expect(escrowScheduleDetailAfterDeposit.startTime).equals(
        UNIX_EPOCH_2021
      );
      expect(escrowScheduleDetailAfterDeposit.endTime).equals(
        UNIX_EPOCH_2021 + SECONDS_IN_TEN_YEARS
      );
      expect(escrowScheduleDetailAfterDeposit.claimedAmount).equals(0);
      expect(escrowScheduleDetailAfterDeposit.totalQuantityRevoked).equals(0);
      expect(escrowScheduleDetailAfterDeposit.exists).equals(true);
    });
  });
});

/**
 * Test categories:
 *
 * Initialization
 *
 * Role access
 * - _beforeRoleChange
 *
 * Event emission (include as relevant in tests for various functions)
 *
 * External functions:
 * - tokensReceived (_depositFor) (_createEscrowSchedule)
 *    Success:
 *      deposits for a removalId with a pre-existing escrow schedule
 *          escrow schedule gets updated with correct amount
 *      deposits for a removalId without a pre-existing escrow schedule
 *          escrow schedule gets created with correct parameters
 *          expected event(s) emitted
 *      Business decision needed: success or failure?? deposits for a removalid that doesn't have a startTime set in its map
 *    Failure:
 *      wrong sending contract (not bpNORI)
 *      ROLE: ESCROW_CREATOR_ROLE
 *      missing supplier address in token id (or id is 0 entirely)
 *      ROLE: recipient cannot be escrow admin
 *
 * - withdrawTo
 *    this is where we can test time advancements and the accurate expected release?
 *    should this be a category unto itself??
 *    Success:
 *      successfully withdraws and distributes claimed amounts across multiple grants
 *
 *
 * - createEscrowSchedule (do we need to keep this? maybe to reduce buyer gas costs?)
 *     Success:
 *        tested by tokensReceived tests
 *     Failure:
 *       schedule already exists
 *
 * - batchRevokeUnreleasedTokenAmounts
 *     Need to test various escrow schedule cases here...
 *      are the values correct for released amounts, etc. when some tokens are revoked
 *
 * Private functions (tested in flow of public/external functions - can't even call these directly)
 * - _depositFor
 * - _createEscrowSchedule
 * - _revokeUnreleasedTokens
 * - _beforeTokenTransfer
 * - _linearReleaseAmountAvailable
 * - _claimableBalanceOf
 * - _claimableBalanceOfSingleEscrowSchedule
 * - _releasedBalanceOfSingleEscrowSchedule
 *
 *
 * View functions: (perhaps testable in the course of other tests during introspection)
 * - revocableQuantity
 * - batchGetEscrowSchedules
 * - getEscrowSchedule
 * - claimableBalanceOf
 *
 * Disabled functions: (see LockedNORI.test for these)
 * - operatorBurn
 * - _beforeOperatorChange
 * - send
 * - operatorSend
 * - transfer
 * - transferFrom
 */
