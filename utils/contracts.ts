import type { Contract } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import type { Contracts } from '../types/contracts';

import type {
  BridgedPolygonNORI,
  Certificate,
  Market,
  LockedNORI,
  RestrictedNORI,
  NORI,
  Removal,
  RemovalTestHarness,
  NoriUSDC,
} from '@/typechain-types';

export const getContract = async <TContractName extends keyof Contracts>({
  contractName,
  hre,
  signer,
}: {
  contractName: TContractName;
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Required<Contracts>[TContractName]> => {
  const deployment = await hre.deployments.get(contractName);
  const contract = await hre.ethers.getContractAt(
    contractName,
    deployment.address
  );
  if (!contract) {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }
  return (
    signer !== undefined ? contract.connect(signer) : contract
  ) as Required<Contracts>[TContractName];
};

export const getBridgedPolygonNori = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<BridgedPolygonNORI> => {
  return getContract({
    contractName: 'BridgedPolygonNORI',
    hre,
    signer,
  });
};

export const getNORI = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<NORI> =>
  getContract({
    contractName: 'NORI',
    hre,
    signer,
  });

export const getNoriUSDC = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<NoriUSDC> =>
  getContract({
    contractName: 'NoriUSDC',
    hre,
    signer,
  });

export const getLockedNORI = ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<LockedNORI> =>
  getContract({
    contractName: 'LockedNORI',
    hre,
    signer,
  });

export const getRestrictedNORI = ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<RestrictedNORI> =>
  getContract({
    contractName: 'RestrictedNORI',
    hre,
    signer,
  });

export const getCertificate = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Certificate> =>
  getContract({
    contractName: 'Certificate',
    hre,
    signer,
  });

export const getRemoval = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Removal> =>
  getContract({
    contractName: 'Removal',
    hre,
    signer,
  });

export const getRemovalTestHarness = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<RemovalTestHarness> =>
  getContract({
    contractName: 'RemovalTestHarness',
    hre,
    signer,
  });

export const getMarket = async ({
  hre,
  signer,
}: {
  hre: HardhatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Market> =>
  getContract({
    contractName: 'Market',
    hre,
    signer,
  });

export const getContractsFromDeployments = async (
  hre: HardhatRuntimeEnvironment
): Promise<Required<Contracts>> => {
  const deployments = await hre.deployments.all();
  const contracts = {
    NORI:
      typeof deployments.NORI?.address === 'string'
        ? await getNORI({ hre })
        : undefined,
    BridgedPolygonNORI:
      typeof deployments.BridgedPolygonNORI?.address === 'string'
        ? await getBridgedPolygonNori({ hre })
        : undefined,
    LockedNORI:
      typeof deployments.LockedNORI?.address === 'string'
        ? await getLockedNORI({ hre })
        : undefined,
    RestrictedNORI:
      typeof deployments.RestrictedNORI?.address === 'string'
        ? await getRestrictedNORI({ hre })
        : undefined,
    Market:
      typeof deployments.Market?.address === 'string'
        ? await getMarket({ hre })
        : undefined,
    Removal:
      typeof deployments.Removal?.address === 'string'
        ? await getRemoval({ hre })
        : undefined,
    Certificate:
      typeof deployments.Certificate?.address === 'string'
        ? await getCertificate({ hre })
        : undefined,
    RemovalTestHarness:
      typeof deployments.RemovalTestHarness?.address === 'string'
        ? await getRemovalTestHarness({ hre })
        : undefined,
    NoriUSDC:
      typeof deployments.NoriUSDC?.address === 'string'
        ? await getNoriUSDC({ hre })
        : undefined,
  } as Required<Contracts>;
  return contracts;
};
