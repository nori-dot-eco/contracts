import { BigNumber } from 'ethers';
import type { namedAccounts } from 'hardhat';

import { mockDepositNoriToPolygon, depositNoriUSDC } from './polygon';

import type { DecodedRemovalIdV0Struct } from '@/typechain-types/artifacts/contracts/Removal';
import { defaultRemovalTokenIdFixture } from '@/test/fixtures/removal';
import { sum } from '@/utils/math';
import { generateRandomSubIdentifier } from '@/utils/removal';
import type {
  Removal,
  Certificate,
  Market,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
  NoriUSDC,
} from '@/typechain-types';
import { formatTokenAmount } from '@/utils/units';
import { getContractsFromDeployments } from '@/utils/contracts';
import { Zero } from '@/constants/units';

export * from './chai';
export * from './polygon';

interface ContractInstances {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  noriUSDC: NoriUSDC;
  removal: Removal;
  certificate: Certificate;
  market: Market;
  lNori: LockedNORI;
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
  purchaseTokenBalance?: BigNumber;
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
          buyer: RequiredKeys<UserFixture, 'purchaseTokenBalance'>;
        };
    };

// todo helpers/removal.ts
export const createBatchMintData = async ({
  hre,
  projectId = 1_234_567_890,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  projectId?: number;
}): Promise<{
  projectId: Parameters<Removal['mintBatch']>[3];
}> => {
  return {
    projectId: BigNumber.from(projectId),
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
}

// todo helpers/removal.ts
export interface RemovalDataForListing {
  projectId?: number;
  listNow?: boolean;
  removals: (Partial<DecodedRemovalIdV0Struct> & {
    tokenId?: BigNumber;
    amount: BigNumber;
    projectId?: number;
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
  const projectId = removalDataToList.projectId ?? 1_234_567_890;

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
  const removalAmounts = removalDataToList.removals.map(
    (removalData) => removalData.amount
  );
  await removal.mintBatch(
    removalDataToList.listNow === false
      ? removals[0].supplierAddress
      : market.address,
    removalAmounts,
    removals,
    projectId
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
  };
};

// todo helpers/setup.ts
export const setupTest = global.hre.deployments.createFixture(
  async (
    hre: CustomHardHatRuntimeEnvironment,
    options?: SetupTestOptions
  ): Promise<TestEnvironment> => {
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
    await hre.deployments.fixture([
      'assets',
      'market',
      'configure',
      'LockedNORI',
      'test',
    ]);
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
        totalAmountOfSuppliers =
          mintResultData.totalAmountOfSuppliers + totalAmountOfSuppliers;
        totalAmountOfRemovals =
          mintResultData.totalAmountOfRemovals + totalAmountOfRemovals;
        projectId = mintResultData.projectId; // todo allow multiple schedules/projects/percentages per fixture
      }
      if (v.bpBalance !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially
        await mockDepositNoriToPolygon({
          hre,
          contracts,
          amount: v.bpBalance,
          to: hre.namedAccounts[k],
          signer: hre.namedSigners[k],
        });
      }
      if (v.purchaseTokenBalance !== undefined) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially
        await depositNoriUSDC({
          hre,
          contracts,
          amount: v.purchaseTokenBalance,
          to: hre.namedAccounts[k],
          signer: hre.namedSigners.admin,
        });
      }
    }
    return {
      hre,
      feePercentage: options?.feePercentage ?? 25,
      contracts,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      noriUSDC: contracts.NoriUSDC,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      market: contracts.Market,
      lNori: contracts.LockedNORI,
      removalTestHarness: contracts.RemovalTestHarness,
      userFixtures,
      contractFixtures,
      listedRemovalIds: removals,
      totalAmountOfSupply,
      totalAmountOfSuppliers,
      totalAmountOfRemovals,
      projectId,
      removalAmounts,
    } as TestEnvironment;
  }
);
