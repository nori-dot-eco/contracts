import type {
  Certificate,
  FIFOMarket,
  Removal,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
} from '../../typechain-types';
import * as contractsConfig from '../../contracts.json';

export interface Contracts {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  fifoMarket: FIFOMarket;
  lNori: LockedNORI;
}

export const getDeployments = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<Contracts> => {
  const { ethers } = hre;
  const noriInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/NORI.sol/NORI.json')
    ).abi,
    contractsConfig.hardhat.NORI.proxyAddress
  )) as NORI;
  const removalInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/Removal.sol/Removal.json')
    ).abi,
    contractsConfig.hardhat.Removal.proxyAddress
  )) as Removal;
  const certificateInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/Certificate.sol/Certificate.json')
    ).abi,
    contractsConfig.hardhat.Certificate.proxyAddress
  )) as Certificate;
  const bridgedPolygonNoriInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json')
    ).abi,
    contractsConfig.hardhat.BridgedPolygonNORI.proxyAddress
  )) as BridgedPolygonNORI;
  const fifoMarketInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/FIFOMarket.sol/FIFOMarket.json')
    ).abi,
    contractsConfig.hardhat.FIFOMarket.proxyAddress
  )) as FIFOMarket;
  const lNoriInstance = (await ethers.getContractAt(
    (
      await require('@/artifacts/LockedNORI.sol/LockedNORI.json')
    ).abi,
    contractsConfig.hardhat.LockedNORI.proxyAddress
  )) as LockedNORI;

  return {
    nori: noriInstance,
    bpNori: bridgedPolygonNoriInstance,
    removal: removalInstance,
    certificate: certificateInstance,
    fifoMarket: fifoMarketInstance,
    lNori: lNoriInstance,
  };
};
