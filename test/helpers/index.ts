import type { BigNumber, BigNumberish } from 'ethers';
import type { namedAccounts } from 'hardhat';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';

import { defaultRemovalTokenIdFixture } from '../fixtures/removal';

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
  // LockedNORI, // todo import from forked repo
  RestrictedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
} from '@/typechain-types';
import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/contracts/Removal';
import { formatTokenAmount, formatTokenString } from '@/utils/units';
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
  // lNori: LockedNORI; // todo import from forked repo
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
  bpBalance?: BigNumberish;
  mockERC1155PresetPausableNonTransferrableFixtures?: {
    tokens: MockERC1155PresetPausableNonTransferrableFixture[];
    approvalsForAll?: string[];
  };
}

export type UserFixtures = {
  [Property in keyof typeof namedAccounts]?: UserFixture;
};

interface ContractFixture {
  paused: boolean;
}

type ContractFixtures = {
  [Property in keyof Contracts]?: ContractFixture;
};

type TestFixture<
  TOptions = {
    userFixtures?: UserFixtures;
    contractFixtures?: ContractFixtures;
  }
> = ContractInstances &
  TOptions & {
    hre: CustomHardHatRuntimeEnvironment;
    contracts: Required<Contracts>; // todo deprecate
  };

// todo helpers/setup.ts
export const setupTest = global.hre.deployments.createFixture(
  async <
    TOptions extends {
      userFixtures?: UserFixtures;
      contractFixtures?: ContractFixtures;
    } = {
      userFixtures?: UserFixtures;
      contractFixtures?: ContractFixtures;
    }
  >(
    hre: CustomHardHatRuntimeEnvironment,
    options?: TOptions
  ): Promise<
    ContractInstances &
      TOptions & {
        hre: CustomHardHatRuntimeEnvironment;
        contracts: Required<Contracts>; // todo deprecate
      }
  > => {
    const buyerInitialBPNoriBalance = formatTokenAmount(100_000_000);
    const userFixtures: UserFixtures = {
      buyer: {
        bpBalance: buyerInitialBPNoriBalance,
      },
      admin: {
        bpBalance: formatTokenAmount(100_000_000),
      },
      ...options?.userFixtures,
    };
    const contractFixtures: ContractFixtures = {
      ...options?.contractFixtures,
    };
    await hre.deployments.fixture(['assets', 'market', 'test']);
    const contracts = await getContractsFromDeployments(hre);
    for (const [k, v] of Object.entries(userFixtures) as [
      keyof typeof namedAccounts,
      UserFixture
    ][]) {
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
    for (const [contract, fixture] of Object.entries(contractFixtures) as [
      keyof Contracts,
      ContractFixture
    ][]) {
      if (fixture.paused) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        await (contracts[contract] as any).pause();
      }
    }
    return {
      hre,
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
    } as TestFixture<TOptions>;
  }
);

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
  totalAmountOfSupply: number;
  totalAmountOfSuppliers: number;
  totalAmountOfRemovals: number;
  removalAmounts: BigNumber[];
  projectId: number;
  scheduleStartTime: number;
}

// todo helpers/removal.ts
export type RemovalDataForListing = Partial<UnpackedRemovalIdV0Struct> & {
  amount: number;
};

// todo helpers/removal.ts
export const getTotalAmountOfSupply = (
  removals: RemovalDataForListing[]
): number => removals.reduce((sum, removal) => sum + removal.amount, 0);
// todo helpers/removal.ts
const getTotalAmountOfSuppliers = (removals: RemovalDataForListing[]): number =>
  removals.reduce(
    (supplierSet, removal) => supplierSet.add(removal.supplierAddress),
    new Set()
  ).size ?? 1;
// todo helpers/removal.ts
const getTotalAmountOfRemovals = (removals: RemovalDataForListing[]): number =>
  removals.length;

// todo de-dupe this logic from tests
// todo helpers/removal.ts
export const batchMintAndListRemovalsForSale = async (options: {
  testSetup: Awaited<ReturnType<typeof setupTest>>;
  projectId?: number;
  scheduleStartTime?: number;
  holdbackPercentage?: number;
  removalDataToList: RemovalDataForListing[];
}): Promise<RemovalDataFromListing> => {
  const { testSetup, removalDataToList } = options;
  const { removal, fifoMarket, hre } = testSetup;
  const { projectId, scheduleStartTime, holdbackPercentage } = {
    projectId: options.projectId ?? 1_234_567_890,
    scheduleStartTime:
      options.scheduleStartTime ?? (await getLatestBlockTime({ hre })),
    holdbackPercentage: options.holdbackPercentage ?? 0,
  };
  const { supplier } = hre.namedAccounts;
  const defaultStartingVintage = 2016;
  const listedRemovalIds: BigNumber[] = [];
  for (const [index, removalData] of removalDataToList.entries()) {
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
  const removalAmounts = removalDataToList.map((removalData) =>
    formatTokenString(removalData.amount.toString())
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
  const totalAmountOfSupply = getTotalAmountOfSupply(removalDataToList);
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
  };
};
