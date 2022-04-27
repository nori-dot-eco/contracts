import type { BigNumber } from 'ethers';

import type {
  Certificate,
  FIFOMarket,
  Removal,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
} from '../../typechain-types';
import type { UnpackedRemovalIdV0Struct } from '../../typechain-types/Removal';
import { asciiStringToHexString } from '../../utils/bytes';

import { mockDepositNoriToPolygon } from './polygon';

import { formatTokenAmount } from '@/utils/units';
import { Contracts } from '@/utils/deploy';
import {
  getBridgedPolygonNori,
  getCertificate,
  getRemoval,
  getFIFOMarket,
  getLockedNORI,
  getNORI,
} from '../../utils/contracts';

export * from './chai';
export * from './interfaces';
export * from './polygon';

export interface ContractInstances {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  fifoMarket: FIFOMarket;
  lNori: LockedNORI;
}

export const getLatestBlockTime = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<number> => {
  return (await hre.ethers.provider.getBlock('latest')).timestamp;
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

export const getContractsFromDeployments = async (
  hre: CustomHardHatRuntimeEnvironment
): Promise<Required<Contracts>> => {
  const deployments = await hre.deployments.all();
  const contracts = {
    NORI: deployments['NORI']?.address ? await getNORI({ hre }) : undefined,
    BridgedPolygonNORI: deployments['BridgedPolygonNORI']?.address
      ? await getBridgedPolygonNori({ hre })
      : undefined,
    LockedNORI: deployments['LockedNORI']?.address
      ? await getLockedNORI({ hre })
      : undefined,
    FIFOMarket: deployments['FIFOMarket']?.address
      ? await getFIFOMarket({ hre })
      : undefined,
    Removal: deployments['Removal']?.address
      ? await getRemoval({ hre })
      : undefined,
    Certificate: deployments['Certificate']?.address
      ? await getCertificate({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};

export const setupTest = global.hre.deployments.createFixture(
  async (
    hre
  ): Promise<
    ContractInstances & {
      hre: CustomHardHatRuntimeEnvironment;
      contracts: Required<Contracts>;
    }
  > => {
    hre.ethernalSync = false;
    await hre.deployments.fixture(['assets', 'market']);
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
    subIdentifier: 99039930, // parcel id
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
