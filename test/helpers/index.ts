import type { BigNumber, BigNumberish } from 'ethers';
import type { namedAccounts } from 'hardhat';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';

import { mockDepositNoriToPolygon } from '@/test/helpers/polygon';
import { formatRemovalIdData } from '@/utils/removal';
import type {
  Removal,
  Certificate,
  FIFOMarket,
  LockedNORI,
  RestrictedNORI,
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
  console.log({ block });
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

const generateRandomSubIdentifier = (): number =>
  Math.floor(Math.random() * (2 ** 32 - 1));

type UserFixtures = {
  [Property in keyof typeof namedAccounts]?: {
    bpBalance?: BigNumberish;
  };
};

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
    for (const [k, v] of Object.entries(userFixtures)) {
      if (isBigNumberish(v.bpBalance)) {
        // eslint-disable-next-line no-await-in-loop -- these need to run serially or it breaks the gas reporter
        await mockDepositNoriToPolygon({
          hre,
          contracts,
          amount: v.bpBalance,
          to: hre.namedAccounts[k as keyof typeof namedAccounts],
          signer: hre.namedSigners[k as keyof typeof namedAccounts],
        });
      } else {
        throw new Error(`invalid bpBalance for ${k}`);
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
      rNori: contracts.RestrictedNORI,
      removalTestHarness: contracts.RemovalTestHarness,
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
      methodologyVersion: 0,
      vintage: 2018,
      country: asciiStringToHexString('US'),
      subdivision: asciiStringToHexString('IA'),
      supplierAddress: hre.namedAccounts.supplier,
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
  listNow = true,
  projectId = 1_234_567_890,
  scheduleStartTime = NOW,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  fifoMarket: FIFOMarket;
  listNow?: boolean;
  projectId?: number;
  scheduleStartTime?: number;
}): Parameters<Removal['mintBatch']>[3] => {
  const packedData = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256', 'address', 'bool'],
    [projectId, scheduleStartTime, fifoMarket.address, listNow]
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
export const batchMintAndListRemovalsForSale = async ({
  removalDataToList,
  removal,
  fifoMarket,
  hre,
  listNow = true,
  projectId = 1_234_567_890,
  scheduleStartTime = NOW,
}: {
  removalDataToList: RemovalDataForListing[];
  removal: Removal;
  fifoMarket: FIFOMarket;
  hre: CustomHardHatRuntimeEnvironment;
  listNow?: boolean;
  projectId?: number;
  scheduleStartTime?: number;
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
    createBatchMintData({
      hre,
      fifoMarket,
      listNow,
      projectId,
      scheduleStartTime,
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
