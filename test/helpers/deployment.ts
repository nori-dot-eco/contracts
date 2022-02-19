import type {
  Certificate,
  FIFOMarket,
  Removal,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  NORI__factory,
  Removal__factory,
  Certificate__factory,
  FIFOMarket__factory,
  LockedNORI__factory,
  BridgedPolygonNORI__factory,
} from '../../typechain-types';
import * as contractsConfig from '../../contracts.json';
import { MUMBAI_CHILD_CHAIN_MANAGER_PROXY } from '../../constants/addresses';

export interface Contracts {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  fifoMarket: FIFOMarket;
  lNori: LockedNORI;
}

export const deploy =async ({hre}:{hre:CustomHardHatRuntimeEnvironment}):Promise<Contracts> => {
    const { getNamedAccounts, upgrades, run, ethers } = hre;
    await run('deploy:erc1820');
    const { noriWallet } = await getNamedAccounts();
    const NORI = await ethers.getContractFactory<NORI__factory>('NORI');
    const Removal = await ethers.getContractFactory<Removal__factory>('Removal');
    const Certificate = await ethers.getContractFactory<Certificate__factory>(
      'Certificate'
    );
    const FIFOMarket = await ethers.getContractFactory<FIFOMarket__factory>(
      'FIFOMarket'
    );
    const nori = await upgrades.deployProxy<NORI>(NORI, []);
    await nori.deployed();
    const LockedNoriFactory = await ethers.getContractFactory<LockedNORI__factory>('LockedNORI');
  
  const BridgedPolygonNORI = await ethers.getContractFactory<BridgedPolygonNORI__factory>('BridgedPolygonNORI');
  const bpNori = await upgrades.deployProxy<BridgedPolygonNORI>(
    BridgedPolygonNORI,
    [MUMBAI_CHILD_CHAIN_MANAGER_PROXY,],
    { initializer: 'initialize(address)' },
  );
  await bpNori.deployed();
  const lNori = await upgrades.deployProxy<LockedNORI>(
    LockedNoriFactory,
    [bpNori.address],
    {
      initializer: 'initialize(address)',
    }
  );
  await lNori.deployed();
    const removal = await upgrades.deployProxy<Removal>(Removal, [], {
      initializer: 'initialize()',
    });
    await removal.deployed();
    const certificate = await upgrades.deployProxy<Certificate>(
      Certificate,
      [],
      {
        initializer: 'initialize()',
      }
    );
    await certificate.deployed();
    const fifoMarket = await upgrades.deployProxy<FIFOMarket>(
      FIFOMarket,
      [
        removal.address,
        bpNori.address,
        certificate.address,
        noriWallet,
        15,
      ],
      {
        initializer: 'initialize(address,address,address,address,uint256)',
      }
    );
    await fifoMarket.deployed();
  
    return {nori,removal,fifoMarket,certificate,lNori,bpNori};
  
}

export const getDeployments = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<Contracts> => {
  const { ethers } = hre;
  console.log('get deployments======');
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
