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

import { mockDepositNoriToPolygon } from './polygon';

import { formatTokenAmount } from '@/utils/units';
import { deploy } from '@/deploy/0_deploy_contracts';
import type { Contracts } from '@/utils/deploy';

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

export const createFixture = global.hre.deployments.createFixture; // todo use hardhat-deploy fixtures (https://github.com/wighawag/hardhat-deploy#3-hardhat-test) (requires this to be fixed: https://github.com/cgewecke/hardhat-gas-reporter/issues/86)

export const setupTestEnvironment = createFixture(
  async (
    hre
  ): Promise<ContractInstances & { hre: CustomHardHatRuntimeEnvironment }> => {
    hre.ethernalSync = false;
    const contracts = (await deploy(hre)) as Required<Contracts>;
    await mockDepositNoriToPolygon({
      hre,
      contracts,
      amount: formatTokenAmount(100_000_000),
      to: hre.namedAccounts.admin,
      signer: hre.namedSigners.admin,
    });
    return {
      hre,
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
    country: 'US',
    admin1: 'IA',
    supplierAddress: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
    subIdentifier: 99039930, // parcel id
  };
  const removalData = { ...defaultRemovalData, ...options };
  const abiEncodedRemovalData = hre.ethers.utils.defaultAbiCoder.encode(
    [
      'uint256',
      'uint256',
      'uint256',
      'uint256',
      'string',
      'string',
      'address',
      'uint256',
    ],
    Object.values(removalData)
  );
  const removalId = await removalInstance.createRemovalId(
    abiEncodedRemovalData
  );
  return removalId;
};
