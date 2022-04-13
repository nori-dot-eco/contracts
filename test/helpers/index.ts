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

export const getContractsFromDeployments = async (
  hre: CustomHardHatRuntimeEnvironment
): Promise<Required<Contracts>> => {
  const deployments = await hre.deployments.all();
  const contracts = {
    NORI: deployments['NORI']?.address
      ? await hre.ethers.getContractAt('NORI', deployments['NORI'].address)
      : undefined,
    BridgedPolygonNORI: deployments['BridgedPolygonNORI']?.address
      ? await hre.ethers.getContractAt(
          'BridgedPolygonNORI',
          deployments['BridgedPolygonNORI'].address
        )
      : undefined,
    LockedNORI: deployments['LockedNORI']?.address
      ? await hre.ethers.getContractAt(
          'LockedNORI',
          deployments['LockedNORI'].address
        )
      : undefined,
    FIFOMarket: deployments['FIFOMarket']?.address
      ? await hre.ethers.getContractAt(
          'FIFOMarket',
          deployments['FIFOMarket'].address
        )
      : undefined,
    Removal: deployments['Removal']?.address
      ? await hre.ethers.getContractAt(
          'Removal',
          deployments['Removal']?.address
        )
      : undefined,
    Certificate: deployments['Removal']?.address
      ? await hre.ethers.getContractAt(
          'Certificate',
          deployments['Certificate'].address
        )
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
