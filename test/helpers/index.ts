import { BigNumber } from 'ethers';
import type { namedAccounts } from 'hardhat';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';
import { add } from '@nori-dot-com/math';

import { defaultRemovalTokenIdFixture } from '../fixtures/removal';

import { sum } from '@/utils/math';
import type {
  MockCertificate,
  MockERC1155PresetPausableNonTransferrable,
} from '@/typechain-types/contracts/mocks';
import { mockDepositNoriToPolygon } from '@/test/helpers/polygon';
import {
  formatRemovalIdData,
  generateRandomSubIdentifier,
} from '@/utils/removal';
import type {
  Removal,
  Certificate,
  FIFOMarket,
  LockedNORIV2,
  RestrictedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
} from '@/typechain-types';
import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/contracts/Removal';
import { formatTokenAmount } from '@/utils/units';
import type { Contracts } from '@/utils/contracts';
import { getContractsFromDeployments } from '@/utils/contracts';

export * from './chai';
export * from './interfaces';
export * from './polygon';

interface ContractInstances {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  fifoMarket: FIFOMarket;
  lNori: LockedNORIV2;
  rNori: RestrictedNORI;
  removalTestHarness: RemovalTestHarness;
  mockCertificate: MockCertificate; // todo key remapping of Contracts
  mockERC1155PresetPausableNonTransferrable: MockERC1155PresetPausableNonTransferrable; // todo consider TestHarness vs Mock naming convention
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
  await hre.network.provider.send('evm_setNextBlockTimestamp', [timestamp]);
  await hre.network.provider.send('hardhat_mine');
};

export interface MockERC1155PresetPausableNonTransferrableFixture {
  to: Parameters<MockERC1155PresetPausableNonTransferrable['mintBatch']>[0];
  removalId: Parameters<
    MockERC1155PresetPausableNonTransferrable['mintBatch']
  >[1][number];
  removalAmount: Parameters<
    MockERC1155PresetPausableNonTransferrable['mintBatch']
  >[2][number];
  data: Parameters<MockERC1155PresetPausableNonTransferrable['mintBatch']>[3];
}

interface UserFixture {
  bpBalance?: BigNumber;
  mockERC1155PresetPausableNonTransferrableFixtures?: {
    tokens: MockERC1155PresetPausableNonTransferrableFixture[];
    approvalsForAll?: string[];
  };
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
export const createRemovalTokenId = async ({
  removal,
  removalData,
  hre,
}: {
  removal: Removal;
  removalData?: Partial<UnpackedRemovalIdV0Struct>;
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<BigNumber> => {
  const formattedRemovalData = formatRemovalIdData({
    hre,
    removalData: {
      ...defaultRemovalTokenIdFixture,
      ...removalData,
    },
  });
  const removalId = await removal.createRemovalId(formattedRemovalData);
  return removalId;
};

// todo helpers/removal.ts
export const createBatchMintData = async ({
  hre,
  fifoMarket,
  listNow = true,
  projectId = 1_234_567_890,
  scheduleStartTime,
  holdbackPercentage = 0,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  fifoMarket: FIFOMarket;
  listNow?: boolean;
  projectId?: number;
  scheduleStartTime?: number;
  holdbackPercentage?: number;
}): Promise<Parameters<Removal['mintBatch']>[3]> => {
  const actualScheduleStartTime =
    scheduleStartTime ?? (await getLatestBlockTime({ hre }));
  const packedData = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256', 'uint256', 'address', 'bool'],
    [
      projectId,
      actualScheduleStartTime,
      holdbackPercentage,
      fifoMarket.address,
      listNow,
    ]
  );
  return packedData;
};

// todo helpers/removal.ts
interface RemovalDataFromListing {
  listedRemovalIds: BigNumber[];
  totalAmountOfSupply: BigNumber; // todo bignumber ?
  totalAmountOfSuppliers: number;
  totalAmountOfRemovals: number;
  removalAmounts: BigNumber[];
  projectId: number;
  scheduleStartTime: number;
  holdbackPercentage: number;
}

// todo helpers/removal.ts
interface RemovalDataForListing {
  projectId?: number;
  scheduleStartTime?: number;
  holdbackPercentage?: number;
  removals: (Partial<UnpackedRemovalIdV0Struct> & {
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
  fifoMarket: FIFOMarket;
  removalDataToList: RemovalDataForListing;
}): Promise<RemovalDataFromListing> => {
  const { removal, hre, fifoMarket, removalDataToList } = options;
  const { projectId, scheduleStartTime, holdbackPercentage } = {
    projectId: removalDataToList.projectId ?? 1_234_567_890,
    scheduleStartTime:
      removalDataToList.scheduleStartTime ??
      (await getLatestBlockTime({ hre })),
    holdbackPercentage: removalDataToList.holdbackPercentage ?? 0,
  };
  const { supplier } = hre.namedAccounts;
  const defaultStartingVintage = 2016;
  const listedRemovalIds: BigNumber[] = [];
  for (const [index, removalData] of removalDataToList.removals.entries()) {
    // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
    const removalTokenId = await createRemovalTokenId({
      removal,
      hre,
      removalData: {
        supplierAddress: removalData.supplierAddress ?? supplier,
        vintage: removalData.vintage ?? defaultStartingVintage + index,
        subIdentifier:
          removalData.subIdentifier ?? generateRandomSubIdentifier(),
      },
    });
    listedRemovalIds.push(removalTokenId);
  }
  const removalAmounts = removalDataToList.removals.map((removalData) =>
    formatTokenAmount(removalData.amount)
  );
  await removal.mintBatch(
    supplier,
    removalAmounts,
    listedRemovalIds,
    await createBatchMintData({
      hre,
      fifoMarket,
      listNow: true,
      projectId,
      scheduleStartTime,
      holdbackPercentage,
    })
  );
  const totalAmountOfSupply = sum(removalAmounts);
  const totalAmountOfSuppliers = getTotalAmountOfSuppliers(removalDataToList);
  const totalAmountOfRemovals = getTotalAmountOfRemovals(removalDataToList);
  return {
    listedRemovalIds,
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
    await hre.deployments.fixture(['assets', 'market', 'test']);
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
    let listedRemovalIds: BigNumber[] = [];
    let totalAmountOfSupply = BigNumber.from(0);
    let totalAmountOfSuppliers = 0;
    let totalAmountOfRemovals = 0;
    let projectId = 0;
    let scheduleStartTime = 0;
    let holdbackPercentage = 0;
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
          fifoMarket: contracts.FIFOMarket,
          hre,
        });
        removalAmounts = [...removalAmounts, ...mintResultData.removalAmounts];
        listedRemovalIds = [
          ...listedRemovalIds,
          ...mintResultData.listedRemovalIds,
        ];
        totalAmountOfSupply =
          mintResultData.totalAmountOfSupply.add(totalAmountOfSupply);
        totalAmountOfSuppliers = add(
          mintResultData.totalAmountOfSuppliers,
          totalAmountOfSuppliers
        );
        totalAmountOfRemovals = add(
          mintResultData.totalAmountOfRemovals,
          totalAmountOfRemovals
        );
        projectId = mintResultData.projectId; // todo allow multiple schedules/projects/percentages per fixture
        scheduleStartTime = mintResultData.scheduleStartTime; // todo allow multiple schedules/projects/percentages per fixture
        holdbackPercentage = mintResultData.holdbackPercentage; // todo allow multiple schedules/projects/percentages per fixture
      }
      if (Boolean(v.bpBalance)) {
        if (isBigNumberish(v.bpBalance)) {
          // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
          await mockDepositNoriToPolygon({
            hre,
            contracts,
            amount: v.bpBalance,
            to: hre.namedAccounts[k],
            signer: hre.namedSigners[k],
          });
        } else {
          throw new Error(`Invalid bpBalance for ${k}.`);
        }
      }
      if (v.mockERC1155PresetPausableNonTransferrableFixtures !== undefined) {
        const { tokens, approvalsForAll } =
          v.mockERC1155PresetPausableNonTransferrableFixtures;
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        await contracts.MockERC1155PresetPausableNonTransferrable.mintBatch(
          tokens[0].to,
          tokens?.map((f) => f.removalId),
          tokens?.map((f) => f.removalAmount),
          tokens[0].data
        );
        if (approvalsForAll !== undefined) {
          for (const approval of approvalsForAll) {
            // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
            await contracts.MockERC1155PresetPausableNonTransferrable.connect(
              hre.namedSigners[k]
            ).setApprovalForAll(approval, true);
          }
        }
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
      fifoMarket: contracts.FIFOMarket,
      // lNori: contracts.LockedNORI, // todo import from forked repo
      rNori: contracts.RestrictedNORI,
      removalTestHarness: contracts.RemovalTestHarness,
      mockCertificate: contracts.MockCertificate,
      mockERC1155PresetPausableNonTransferrable:
        contracts.MockERC1155PresetPausableNonTransferrable,
      userFixtures,
      contractFixtures,
      listedRemovalIds,
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
