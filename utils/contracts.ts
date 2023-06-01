import type { Contract } from 'ethers';

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
  hre: CustomHardHatRuntimeEnvironment;
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
    signer == undefined ? contract : contract.connect(signer)
  ) as Required<Contracts>[TContractName];
};

export const getBridgedPolygonNori = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
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
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Market> =>
  getContract({
    contractName: 'Market',
    hre,
    signer,
  });

export const getContractsFromDeployments = async (
  hre: CustomHardHatRuntimeEnvironment
): Promise<Required<Contracts>> => {
  const deployments = await hre.deployments.all();
  const contracts = {
    NORI: deployments.NORI?.address ? await getNORI({ hre }) : undefined,
    BridgedPolygonNORI: deployments.BridgedPolygonNORI?.address
      ? await getBridgedPolygonNori({ hre })
      : undefined,
    LockedNORI: deployments.LockedNORI?.address
      ? await getLockedNORI({ hre })
      : undefined,
    RestrictedNORI: deployments.RestrictedNORI?.address
      ? await getRestrictedNORI({ hre })
      : undefined,
    Market: deployments.Market?.address ? await getMarket({ hre }) : undefined,
    Removal: deployments.Removal?.address
      ? await getRemoval({ hre })
      : undefined,
    Certificate: deployments.Certificate?.address
      ? await getCertificate({ hre })
      : undefined,
    RemovalTestHarness: deployments.RemovalTestHarness?.address
      ? await getRemovalTestHarness({ hre })
      : undefined,
    NoriUSDC: deployments.NoriUSDC?.address
      ? await getNoriUSDC({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};
