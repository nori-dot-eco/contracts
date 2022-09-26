import { BigNumber } from 'ethers';
import type { namedAccounts } from 'hardhat';

import type { DecodedRemovalIdV0Struct } from '@/typechain-types/artifacts/contracts/Removal';
import { defaultRemovalTokenIdFixture } from '@/test/fixtures/removal';
import { sum } from '@/utils/math';
import { mockDepositNoriToPolygon } from '@/test/helpers/polygon';
import { generateRandomSubIdentifier } from '@/utils/removal';
import type {
  Removal,
  Certificate,
  Market,
  LockedNORI,
  RestrictedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
} from '@/typechain-types';
import { formatTokenAmount } from '@/utils/units';
import { getContractsFromDeployments } from '@/utils/contracts';
import { Zero } from '@/constants/units';

export * from './chai';
export * from './polygon';

interface ContractInstances {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  market: Market;
  lNori: LockedNORI;
  rNori: RestrictedNORI;
  removalTestHarness: RemovalTestHarness;
}

export const NOW = Math.floor(Date.now() / 1000);

export const getLatestBlockTime = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<number> => {
  const block = await hre.ethers.provider.getBlock('latest');
  return block.timestamp;
};

export const advanceTime = async ({
  hre,
  timestamp,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  timestamp: number;
}): Promise<void> => {
  await hre.network.provider.send('evm_setNextBlockTimestamp', [
    Math.round(timestamp),
  ]);
  await hre.network.provider.send('hardhat_mine');
};

interface UserFixture {
  bpBalance?: BigNumber;
  removalDataToList?: RemovalDataForListing;
  roles?: RoleFixtures;
}

export type UserFixtures = {
  [Property in keyof typeof namedAccounts]?: UserFixture;
};

interface ContractFixture {
  paused?: boolean;
}

type ContractFixtures = {
  [Property in keyof Contracts]?: ContractFixture;
};

type RoleFixtures = {
  [Property in keyof ContractFixtures]?: string[];
};

interface SetupTestOptions {
  userFixtures?: UserFixtures;
  contractFixtures?: ContractFixtures;
  feePercentage?: number; // todo market fixture
}

type TestEnvironment<TOptions extends SetupTestOptions = SetupTestOptions> =
  ContractInstances &
    Required<TOptions> &
    RemovalDataFromListing & {
      hre: CustomHardHatRuntimeEnvironment;
      contracts: Required<Contracts>; // todo deprecate
    } & {
      userFixtures: RequiredKeys<UserFixtures, 'admin' | 'buyer'> &
        TOptions['userFixtures'] & {
          buyer: RequiredKeys<UserFixture, 'bpBalance'>;
        };
    };

// todo helpers/removal.ts
export const createBatchMintData = async ({
  hre,
  projectId = 1_234_567_890,
  scheduleStartTime,
  holdbackPercentage = Zero,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  projectId?: number;
  scheduleStartTime?: number;
  holdbackPercentage?: BigNumber;
}): Promise<{
  projectId: Parameters<Removal['mintBatch']>[3];
  scheduleStartTime: Parameters<Removal['mintBatch']>[4];
  holdbackPercentage: Parameters<Removal['mintBatch']>[5];
}> => {
  const actualScheduleStartTime = BigNumber.from(
    scheduleStartTime ?? (await getLatestBlockTime({ hre }))
  );
  return {
    projectId: BigNumber.from(projectId),
    scheduleStartTime: actualScheduleStartTime,
    holdbackPercentage,
  };
};

// todo helpers/removal.ts
interface RemovalDataFromListing {
  listedRemovalIds: DecodedRemovalIdV0Struct[];
  totalAmountOfSupply: BigNumber; // todo bignumber ?
  totalAmountOfSuppliers: number;
  totalAmountOfRemovals: number;
  removalAmounts: BigNumber[];
  projectId: number;
  scheduleStartTime: number;
  holdbackPercentage: BigNumber;
}

// todo helpers/removal.ts
interface RemovalDataForListing {
  projectId?: number;
  scheduleStartTime?: number;
  holdbackPercentage?: BigNumber;
  listNow?: boolean;
  removals: (Partial<DecodedRemovalIdV0Struct> & {
    tokenId?: BigNumber;
    amount: number; // todo bignumber
    projectId?: number;
    scheduleStartTime?: number;
    holdbackPercentage?: number;
  })[];
}

// todo helpers/removal.ts
const getTotalAmountOfSuppliers = ({
  removals,
}: RemovalDataForListing): number =>
  removals.reduce(
    (supplierSet, removal) => supplierSet.add(removal.supplierAddress),
    new Set()
  ).size ?? 1;

// todo helpers/removal.ts
const getTotalAmountOfRemovals = ({
  removals,
}: RemovalDataForListing): number => removals.length;

// todo de-dupe this logic from tests
// todo helpers/removal.ts
export const batchMintAndListRemovalsForSale = async (options: {
  hre: CustomHardHatRuntimeEnvironment;
  removal: Removal;
  market: Market;
  removalDataToList: RemovalDataForListing;
}): Promise<RemovalDataFromListing> => {
  const { removal, hre, removalDataToList, market } = options;
  const { projectId, scheduleStartTime, holdbackPercentage } = {
    projectId: removalDataToList.projectId ?? 1_234_567_890,
    scheduleStartTime:
      removalDataToList.scheduleStartTime ??
      (await getLatestBlockTime({ hre })),
    holdbackPercentage: removalDataToList.holdbackPercentage ?? Zero,
  };
  const { supplier } = hre.namedAccounts;
  const defaultStartingVintage = 2016;
  const removals: DecodedRemovalIdV0Struct[] = [];
  for (const [index, removalData] of removalDataToList.removals.entries()) {
    const removalTokenId: DecodedRemovalIdV0Struct = {
      ...defaultRemovalTokenIdFixture,
      supplierAddress: removalData.supplierAddress ?? supplier,
      vintage: removalData.vintage ?? defaultStartingVintage + index,
      subIdentifier: removalData.subIdentifier ?? generateRandomSubIdentifier(),
    };
    removals.push(removalTokenId);
  }
  const removalAmounts = removalDataToList.removals.map((removalData) =>
    formatTokenAmount(removalData.amount)
  );
  await removal.mintBatch(
    removalDataToList.listNow === false ? supplier : market.address,
    removalAmounts,
    removals,
    projectId,
    scheduleStartTime,
    holdbackPercentage
  );
  const totalAmountOfSupply = sum(removalAmounts);
  const totalAmountOfSuppliers = getTotalAmountOfSuppliers(removalDataToList);
  const totalAmountOfRemovals = getTotalAmountOfRemovals(removalDataToList);
  return {
    listedRemovalIds: removals,
    totalAmountOfSupply,
    totalAmountOfSuppliers,
    totalAmountOfRemovals,
    removalAmounts,
    projectId,
    scheduleStartTime,
    holdbackPercentage,
  };
};

// todo helpers/setup.ts
export const setupTest = global.hre.deployments.createFixture(
  async (
    hre: CustomHardHatRuntimeEnvironment,
    options?: SetupTestOptions
  ): Promise<TestEnvironment<SetupTestOptions>> => {
    const userFixtures: UserFixtures = {
      ...options?.userFixtures,
      buyer: {
        bpBalance: formatTokenAmount(100_000_000),
        ...options?.userFixtures?.buyer,
      },
      admin: {
        bpBalance: formatTokenAmount(100_000_000),
        ...options?.userFixtures?.admin,
      },
    };
    const contractFixtures: ContractFixtures = {
      ...options?.contractFixtures,
    };
    await hre.deployments.fixture(['assets', 'market', 'LockedNORI', 'test']);
    const contracts = await getContractsFromDeployments(hre);
    for (const [contract, fixture] of Object.entries(contractFixtures) as [
      keyof Contracts,
      ContractFixture
    ][]) {
      if (fixture.paused !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        await (contracts[contract] as any).pause();
      }
    }
    let removals: DecodedRemovalIdV0Struct[] = [];
    let totalAmountOfSupply = Zero;
    let totalAmountOfSuppliers = 0;
    let totalAmountOfRemovals = 0;
    let projectId = 0;
    let scheduleStartTime = 0;
    let holdbackPercentage = Zero;
    let removalAmounts: BigNumber[] = [];
    for (const [k, v] of Object.entries(userFixtures) as [
      keyof typeof namedAccounts,
      UserFixture
    ][]) {
      if (v.roles !== undefined) {
        for (const [contract, roles] of Object.entries(v.roles) as [
          keyof RoleFixtures,
          RoleFixtures[keyof RoleFixtures]
        ][]) {
          if (roles !== undefined) {
            for (const role of roles) {
              // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
              await (contracts[contract] as any).grantRole(
                // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
                await (contracts[contract] as any)[role](),
                hre.namedAccounts[k]
              );
            }
          }
        }
      }
      if (v.removalDataToList !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        const mintResultData = await batchMintAndListRemovalsForSale({
          removalDataToList: v.removalDataToList,
          removal: contracts.Removal,
          market: contracts.Market,
          hre,
        });
        removalAmounts = [...removalAmounts, ...mintResultData.removalAmounts];
        removals = [...removals, ...mintResultData.listedRemovalIds];
        totalAmountOfSupply =
          mintResultData.totalAmountOfSupply.add(totalAmountOfSupply);
        totalAmountOfSuppliers = mintResultData.totalAmountOfSuppliers + totalAmountOfSuppliers;
        totalAmountOfRemovals = mintResultData.totalAmountOfRemovals + totalAmountOfRemovals;
        projectId = mintResultData.projectId; // todo allow multiple schedules/projects/percentages per fixture
        scheduleStartTime = mintResultData.scheduleStartTime; // todo allow multiple schedules/projects/percentages per fixture
        holdbackPercentage = mintResultData.holdbackPercentage; // todo allow multiple schedules/projects/percentages per fixture
      }
      const amount = v.bpBalance;
      if (amount !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        await mockDepositNoriToPolygon({
          hre,
          contracts,
          amount,
          to: hre.namedAccounts[k],
          signer: hre.namedSigners[k],
        });
      }
    }
    return {
      hre,
      feePercentage: options?.feePercentage ?? 15,
      contracts,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      market: contracts.Market,
      lNori: contracts.LockedNORI,
      rNori: contracts.RestrictedNORI,
      removalTestHarness: contracts.RemovalTestHarness,
      userFixtures,
      contractFixtures,
      listedRemovalIds: removals,
      totalAmountOfSupply,
      totalAmountOfSuppliers,
      totalAmountOfRemovals,
      projectId,
      scheduleStartTime,
      holdbackPercentage,
      removalAmounts,
    } as TestEnvironment<SetupTestOptions>;
  }
);
