import { BigNumber } from 'ethers';

import { mockDepositNoriToPolygon } from '@/test/helpers';
import type {
  Removal,
  Certificate,
  FIFOMarket,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  RemovalTestHarness,
} from '@/typechain-types';
import type { UnpackedRemovalIdV0Struct } from '@/typechain-types/Removal';
import { asciiStringToHexString } from '@/utils/bytes';
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
  lNori: LockedNORI;
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

export const setupTest = global.hre.deployments.createFixture(
  async (
    hre
  ): Promise<
    ContractInstances & {
      hre: CustomHardHatRuntimeEnvironment;
      contracts: Required<Contracts>; // todo deprecate
    }
  > => {
    hre.ethernalSync = false; // todo set this in the test task
    await hre.deployments.fixture(['assets', 'market', 'test']);
    const contracts = await getContractsFromDeployments(hre);
    await mockDepositNoriToPolygon({
      hre,
      contracts,
      amount: formatTokenAmount(100_000_000),
      to: hre.namedAccounts.admin,
      signer: hre.namedSigners.admin,
    });
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
    };
  }
);

export const createRemovalTokenId = async (
  removalInstance: Removal,
  options?: Partial<UnpackedRemovalIdV0Struct>
): Promise<BigNumber> => {
  const defaultRemovalData: UnpackedRemovalIdV0Struct = {
    idVersion: 0,
    methodology: 1,
    methodologyVersion: 1,
    vintage: 2018,
    country: asciiStringToHexString('US'),
    subdivision: asciiStringToHexString('IA'),
    supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
    subIdentifier: 99_039_930, // parcel id
  };
  const removalData = { ...defaultRemovalData, ...options };
  const abiEncodedRemovalData = hre.ethers.utils.defaultAbiCoder.encode(
    [
      'uint8',
      'uint8',
      'uint8',
      'uint16',
      'bytes2',
      'bytes2',
      'address',
      'uint32',
    ],
    Object.values(removalData)
  );
  const removalId = await removalInstance.createRemovalId(
    abiEncodedRemovalData
  );
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
    BigNumber.from(Math.floor(new Date(vintage, 0).getTime() / 1_000))
  );
};
