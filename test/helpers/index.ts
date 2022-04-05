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

export const createFixture = global.hre.deployments.createFixture; // todo use hardhat-deploy fixtures (https://github.com/wighawag/hardhat-deploy#3-hardhat-test) (requires this to be fixed: https://github.com/cgewecke/hardhat-gas-reporter/issues/86)

export const setupTestEnvironment = createFixture(
  async (
    hre
  ): Promise<ContractInstances & { hre: CustomHardHatRuntimeEnvironment }> => {
    hre.ethernalSync = false;
    const deployments = (await
        hre.deployments.fixture(['NORI', 'BridgedPolygonNORI', 'LockedNORI', 
        'FIFOMarket', 'Certificate', 'Removal'])
    );
    const contracts = {
        NORI: await hre.ethers.getContractAt('NORI', deployments['NORI'].address),
        BridgedPolygonNORI: await hre.ethers.getContractAt('BridgedPolygonNORI', deployments['BridgedPolygonNORI'].address),
        LockedNORI: await hre.ethers.getContractAt('LockedNORI', deployments['LockedNORI'].address),
        FIFOMarket: await hre.ethers.getContractAt('FIFOMarket', deployments['FIFOMarket'].address),
        Removal: await hre.ethers.getContractAt('Removal', deployments['Removal'].address),
        Certificate: await hre.ethers.getContractAt('Certificate', deployments['Removal'].address),
    } as Required<Contracts>;
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
