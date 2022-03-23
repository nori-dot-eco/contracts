import type {
  Certificate,
  FIFOMarket,
  Removal,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
} from '../../typechain-types';

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

const asciiToUint8Array = (str: string): Uint8Array => {
  const chars = [];
  for (let i = 0; i < str.length; ++i) {
    chars.push(str.charCodeAt(i));
  }
  return new Uint8Array(chars);
};

export const createRemovalTokenId = (
  options?: Partial<{
    address: string;
    parcelId: number;
    vintage: number;
    country: string;
    state: string;
    methodology: number;
    methodologyVersion: number;
  }>
): Uint8Array => {
  const defaultValues = {
    address: '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450',
    parcelId: 99039938560,
    vintage: 2018,
    country: 'US',
    state: 'IA',
    methodology: 2,
    methodologyVersion: 1,
  };

  const data = { ...defaultValues, ...options };

  const addressUint8 = ethers.utils.arrayify(data.address);
  const parcelIdUint8 = ethers.utils.zeroPad(
    ethers.utils.hexlify(data.parcelId),
    5
  );
  const vintageUint8 = ethers.utils.zeroPad(
    ethers.utils.hexlify(data.vintage),
    2
  );

  const countryUint8 = asciiToUint8Array(data.country);
  const stateUint8 = asciiToUint8Array(data.state);
  const methodologyAndVersionUint8 = ethers.utils.zeroPad(
    `0x${data.methodology.toString(16)}${data.methodologyVersion.toString(16)}`,
    1
  );

  return new Uint8Array([
    ...addressUint8,
    ...parcelIdUint8,
    ...vintageUint8,
    ...countryUint8,
    ...stateUint8,
    ...methodologyAndVersionUint8,
  ]);
};

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
