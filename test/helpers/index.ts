import type { BigNumberish, BigNumber } from 'ethers';
import type { namedAccounts } from 'hardhat';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';

import type {
  MockCertificate,
  MockERC1155PresetPausableNonTransferrable,
} from '@/typechain-types/contracts/mocks';
import { mockDepositNoriToPolygon } from '@/test/helpers/polygon';
import { formatRemovalIdData } from '@/utils/removal';
import type {
  Removal,
  Certificate,
  FIFOMarket,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
} from '@/typechain-types';
import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/contracts/Removal';
import { asciiStringToHexString } from '@/utils/bytes';
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
  lNori: LockedNORI;
  removalTestHarness: RemovalTestHarness;
  mockCertificate: MockCertificate; // todo key remapping of Contracts
  mockERC1155PresetPausableNonTransferrable: MockERC1155PresetPausableNonTransferrable; // todo consider TestHarness vs Mock naming convention
}

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

interface MockERC1155PresetPausableNonTransferrableFixtures {
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
    tokens: MockERC1155PresetPausableNonTransferrableFixtures[];
    approvalsForAll?: string[];
  };
}

type UserFixtures = {
  [Property in keyof typeof namedAccounts]?: UserFixture;
};

// todo helpers/setup.ts
export const setupTest = global.hre.deployments.createFixture(
  async (
    hre,
    options?: { userFixtures?: UserFixtures }
  ): Promise<
    ContractInstances & {
      hre: CustomHardHatRuntimeEnvironment;
      contracts: Required<Contracts>; // todo deprecate
      userFixtures: UserFixtures;
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
    await hre.deployments.fixture(['assets', 'market', 'test']);
    const contracts = await getContractsFromDeployments(hre);
    for (const [k, v] of Object.entries(userFixtures) as unknown as [
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
    return {
      hre,
      contracts,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      fifoMarket: contracts.FIFOMarket,
      lNori: contracts.LockedNORI,
      removalTestHarness: contracts.RemovalTestHarness,
      mockCertificate: contracts.MockCertificate,
      mockERC1155PresetPausableNonTransferrable:
        contracts.MockERC1155PresetPausableNonTransferrable,
      userFixtures,
    };
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
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 1,
      vintage: 2018,
      country: asciiStringToHexString('US'),
      subdivision: asciiStringToHexString('IA'),
      supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
      subIdentifier: 99_039_930, // parcel id
      ...removalData,
    },
  });
  const removalId = await removal.createRemovalId(formattedRemovalData);
  return removalId;
};

// todo helpers/removal.ts
export const createBatchMintData = ({
  hre,
  fifoMarket,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  fifoMarket: FIFOMarket;
}): Parameters<Removal['mintBatch']>[3] => {
  const packedData = hre.ethers.utils.defaultAbiCoder.encode(
    ['address', 'bool'],
    [fifoMarket.address, true] // todo parameterize listing option
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
export const batchMintAndListRemovalsForSale = async ({
  removalDataToList,
  removal,
  fifoMarket,
  hre,
}: {
  removalDataToList: RemovalDataForListing[];
  removal: Removal;
  fifoMarket: FIFOMarket;
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<RemovalDataFromListing> => {
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
    createBatchMintData({ hre, fifoMarket })
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
  };
};
