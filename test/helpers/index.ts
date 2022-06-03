import { BigNumber } from 'ethers';
import type { BigNumberish } from 'ethers';
import type { namedAccounts } from 'hardhat';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';

import { formatRemovalIdData } from '../../utils/removal';

import { mockDepositNoriToPolygon } from '@/test/helpers';
import type {
  Removal,
  Certificate,
  FIFOMarket,
  LockedNORI,
  EscrowedNORI,
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
  eNori: EscrowedNORI;
  removalTestHarness: RemovalTestHarness;
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
    await Promise.all(
      Object.entries(userFixtures).flatMap(async ([k, v]) => {
        return isBigNumberish(v.bpBalance)
          ? mockDepositNoriToPolygon({
              hre,
              contracts,
              amount: v.bpBalance,
              to: hre.namedAccounts[k as keyof typeof namedAccounts],
              signer: hre.namedSigners[k as keyof typeof namedAccounts],
            })
          : Promise.reject(new Error(`invalid bpBalance for ${k}`));
      })
    );
    return {
      hre,
      contracts,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      fifoMarket: contracts.FIFOMarket,
      lNori: contracts.LockedNORI,
      eNori: contracts.EscrowedNORI,
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
      methodologyVersion: 1,
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

/**
 * Returns an array of unix timestamps that for the vintage of each removal
 * in `removalIds` for convenience of generating realistic escrow schedule start
 * times for minting removals during test setup.
 */
export const createEscrowScheduleStartTimeArray = async (
  removalInstance: Removal,
  removalIds: BigNumber[]
): Promise<BigNumber[]> => {
  const removalVintages = (
    await Promise.all(
      removalIds.map((removalId) =>
        removalInstance.unpackRemovalIdV0(removalId)
      )
    )
  ).map((unpackedRemovalId) => unpackedRemovalId.vintage);
  return removalVintages.map((vintage) =>
    BigNumber.from(Math.floor(new Date(vintage, 0).getTime() / 1000))
  );
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
  const listedRemovalIds = await Promise.all(
    removalDataToList.map((removalData, index) => {
      return createRemovalTokenId({
        removal,
        hre,
        removalData: {
          supplierAddress: removalData.supplierAddress ?? supplier,
          vintage: removalData.vintage ?? defaultStartingVintage + index,
        },
      });
    })
  );
  const removalAmounts = removalDataToList.map((removalData) =>
    formatTokenString(removalData.amount.toString())
  );
  const escrowScheduleStartTimes = await createEscrowScheduleStartTimeArray(
    removal,
    listedRemovalIds
  );
  await removal.mintRemovalBatch(
    supplier,
    removalAmounts,
    listedRemovalIds,
    escrowScheduleStartTimes,
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
