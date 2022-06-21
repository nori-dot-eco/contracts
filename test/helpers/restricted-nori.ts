import type { BigNumber } from 'ethers';

import type { RestrictedNORI } from '@/typechain-types/contracts/RestrictedNORI';
import type { setupTest } from '@/test/helpers';
import { expect } from '@/test/helpers';

export const SECONDS_IN_1_YEAR_AVG = 31_556_952;
export const SECONDS_IN_10_YEARS = 315_569_520;
export const SECONDS_IN_5_YEARS = SECONDS_IN_10_YEARS / 2;

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
