import type { BigNumber } from 'ethers';

import { sum } from '@/utils/math';
import type { RestrictedNORI } from '@/typechain-types';
import type { setupTest } from '@/test/helpers';
import { expect } from '@/test/helpers';

export const SECONDS_IN_1_YEAR_AVG = 31_556_952;
export const SECONDS_IN_10_YEARS = 315_569_520;
export const SECONDS_IN_5_YEARS = SECONDS_IN_10_YEARS / 2;

export const restrictRemovalProceeds = async ({
  // todo fixture
  testSetup,
  removalIds,
  removalAmountsToRestrict,
}: {
  testSetup: Awaited<ReturnType<typeof setupTest>>;
  removalIds: BigNumber[];
  removalAmountsToRestrict: BigNumber[];
}): Promise<BigNumber> => {
  const { rNori, bpNori } = testSetup;
  await Promise.all(
    removalIds.map(async (id, index) => {
      return Promise.all([
        rNori.mint(removalAmountsToRestrict[index], id),
        bpNori.transfer(rNori.address, removalAmountsToRestrict[index]),
      ]);
    })
  );
  return sum(removalAmountsToRestrict);
};

export const compareScheduleDetailForAddressStructs = (
  receivedScheduleDetail: RestrictedNORI.ScheduleDetailForAddressStructOutput,
  expectedScheduleDetail: Partial<RestrictedNORI.ScheduleDetailForAddressStruct>
): void => {
  const keys = [
    'tokenHolder',
    'scheduleTokenId',
    'balance',
    'claimableAmount',
    'claimedAmount',
    'quantityRevoked',
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
