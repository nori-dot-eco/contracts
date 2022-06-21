import type { BigNumber } from 'ethers';

import type { RestrictedNORI } from '@/typechain-types/contracts/RestrictedNORI';
import type { setupTest } from '@/test/helpers';
import {
  createBatchMintData,
  expect,
  createRemovalTokenId,
  NOW,
} from '@/test/helpers';

export const SECONDS_IN_1_YEAR_AVG = 31_556_952;
export const SECONDS_IN_10_YEARS = 315_569_520;
export const SECONDS_IN_5_YEARS = SECONDS_IN_10_YEARS / 2;

export const mintAndListRemovals = async ({
  testSetup,
  projectId = 1_234_567_890,
  scheduleStartTime = NOW,
  removalDataToList = [],
}: {
  testSetup: Awaited<ReturnType<typeof setupTest>>;
  projectId?: number;
  scheduleStartTime?: number;
  removalDataToList?: {
    amount: number;
    vintage?: number;
    supplier?: string;
  }[];
}): Promise<{
  listedRemovalIds: BigNumber[];
  projectId: number;
  scheduleStartTime: number;
}> => {
  const { hre, removal, fifoMarket, rNori } = testSetup;
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
    const removalBalances = removalDataToList.map((removalData) =>
      hre.ethers.utils.parseUnits(removalData.amount.toString())
    );

    const packedData = createBatchMintData({
      hre,
      fifoMarket,
      listNow: true,
      projectId,
      scheduleStartTime,
    });
    expect(
      await removal.mintBatch(supplier, removalBalances, tokenIds, packedData)
    ).to.emit(rNori, 'ScheduleCreated');
  }

  return {
    listedRemovalIds: tokenIds,
    projectId,
    scheduleStartTime,
  };
};

export const formatTokensReceivedUserData = (removalId: BigNumber): any => {
  return hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [removalId]);
};

export const restrictRemovalProceeds = async ({
  testSetup,
  removalIds,
  removalAmountsToRestrict,
}: {
  testSetup: Awaited<ReturnType<typeof setupTest>>;
  removalIds: BigNumber[];
  removalAmountsToRestrict: number[];
}): Promise<void> => {
  const { rNori, bpNori } = testSetup;
  await Promise.all(
    removalIds.map((id, index) => {
      const userData = formatTokensReceivedUserData(id);
      return bpNori.send(
        rNori.address,
        removalAmountsToRestrict[index],
        userData
      );
    })
  );
};

export const compareScheduleDetailForAddressStructs = (
  receivedScheduleDetail: RestrictedNORI.ScheduleDetailForAddressStruct,
  expectedScheduleDetail: Partial<RestrictedNORI.ScheduleDetailForAddressStruct>
): void => {
  const keys = [
    'tokenHolder',
    'scheduleTokenId',
    'startTime',
    'endTime',
    'balance',
    'claimableAmount',
    'claimedAmount',
    'quantityRevoked',
    'exists',
  ] as const;
  for (const key of keys) {
    if (key in expectedScheduleDetail) {
      expect(receivedScheduleDetail[key]).to.equal(expectedScheduleDetail[key]);
    }
  }
};

export const compareScheduleSummaryStructs = (
  receivedScheduleSummary: RestrictedNORI.ScheduleSummaryStruct,
  expectedScheduleSummary: Partial<RestrictedNORI.ScheduleSummaryStruct>
): void => {
  const keys = [
    'scheduleTokenId',
    'startTime',
    'endTime',
    'totalSupply',
    'totalClaimableAmount',
    'totalQuantityRevoked',
    'exists',
  ] as const;
  for (const key of keys) {
    if (key in expectedScheduleSummary) {
      expect(receivedScheduleSummary[key]).to.equal(
        expectedScheduleSummary[key]
      );
    }
  }
  if (expectedScheduleSummary.tokenHolders !== undefined) {
    expect(receivedScheduleSummary.tokenHolders).to.have.members(
      expectedScheduleSummary.tokenHolders
    );
  }
};
