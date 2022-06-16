import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';

import type { RestrictedNORI } from '@/typechain-types/contracts/RestrictedNORI';
import { expect, setupTest, createRemovalTokenId } from '@/test/helpers';

export const NOW = Math.floor(Date.now() / 1000);
export const UNIX_EPOCH_2018 = 1_514_793_600;
export const UNIX_EPOCH_2019 = 1_546_329_600;
export const UNIX_EPOCH_2020 = 1_577_865_600;
export const UNIX_EPOCH_2021 = 1_609_488_000;
export const UNIX_EPOCH_2023 = 1_672_560_000;
export const SECONDS_IN_1_YEAR_AVG = 31_556_952;
export const SECONDS_IN_10_YEARS = 315_569_520;
export const SECONDS_IN_5_YEARS = SECONDS_IN_10_YEARS / 2;

export const setupTestRestrictedNORI = async ({
  removalDataToList = [],
}: {
  buyerInitialBPNoriBalance?: BigNumberish;
  removalDataToList?: {
    amount: number;
    restrictionScheduleStartTime: number;
    vintage?: number;
    supplier?: string;
  }[];
}): Promise<
  Awaited<ReturnType<typeof setupTest>> & {
    listedRemovalIds: BigNumber[];
    restrictionScheduleIds: BigNumber[];
  }
> => {
  const { hre, contracts, removal, fifoMarket, rNori, ...rest } =
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
    const restrictionScheduleStartTimes: BigNumber[] = removalDataToList.map(
      (removalData) =>
        // TODO you might want to add a 0 case here where the restrictionScheduleStartTime remains 0
        // to be able to test cases where the removalId basically has an empty entry for this
        BigNumber.from(removalData.restrictionScheduleStartTime)
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
        restrictionScheduleStartTimes,
        packedData
      )
    ).to.emit(rNori, 'ScheduleCreated');
  }

  const restrictionScheduleIds = await Promise.all(
    tokenIds.map((removalId) => rNori.removalIdToScheduleId(removalId))
  );

  return {
    hre,
    contracts,
    listedRemovalIds: tokenIds,
    restrictionScheduleIds,
    removal,
    fifoMarket,
    rNori,
    ...rest,
  };
};

export const formatTokensReceivedUserData = (removalId: BigNumber): any => {
  return hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [removalId]);
};

export const restrictRemovalProceeds = async ({
  testSetup,
  listedRemovalData,
  removalAmountsToRestrict,
}: {
  testSetup: Awaited<ReturnType<typeof setupTestRestrictedNORI>>;
  listedRemovalData: {
    amount: number;
    restrictionScheduleStartTime: number;
    vintage?: number;
    supplier?: string;
  }[];
  removalAmountsToRestrict: number[];
}): Promise<any> => {
  // todo where is ScheduleSummaryStructOutput?
  const { rNori, bpNori, listedRemovalIds, restrictionScheduleIds } = testSetup;
  await Promise.all(
    listedRemovalData.map((_, index) => {
      const userData = formatTokensReceivedUserData(listedRemovalIds[index]);
      return bpNori.send(
        rNori.address,
        removalAmountsToRestrict[index],
        userData
      );
    })
  );

  const restrictionScheduleDetails = await Promise.all(
    restrictionScheduleIds.map((id) => rNori.getScheduleSummary(id))
  );
  return restrictionScheduleDetails;
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
