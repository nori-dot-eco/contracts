import { Contract } from 'ethers';
import { Contracts } from '@/utils/deploy';
import type {
  BridgedPolygonNORI,
  Certificate,
  FIFOMarket,
  LockedNORI,
  NORI,
  Removal,
} from '../typechain-types';

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

export const getContract = async ({
  contractName,
  hre,
  signer,
}: {
  contractName: string;
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Contract> => {
  const contract = await hre.ethers.getContractAt(
    contractName,
    (
      await hre.deployments.get(contractName)
    ).address
  );
  if (!contract) {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }
  if (signer) {
    return contract.connect(signer);
  }
  return contract;
};

// TODO Is there a smarter way to do this typing dance?
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
  }) as Promise<BridgedPolygonNORI>;
};

export const getNORI = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<NORI> => {
  return getContract({
    contractName: 'NORI',
    hre,
    signer,
  }) as Promise<NORI>;
};

export const getLockedNORI = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<LockedNORI> => {
  return getContract({
    contractName: 'LockedNORI',
    hre,
    signer,
  }) as Promise<LockedNORI>;
};

export const getCertificate = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Certificate> => {
  return getContract({
    contractName: 'Certificate',
    hre,
    signer,
  }) as Promise<Certificate>;
};

export const getRemoval = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<Removal> => {
  return getContract({
    contractName: 'Removal',
    hre,
    signer,
  }) as Promise<Removal>;
};

export const getFIFOMarket = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<FIFOMarket> => {
  return getContract({
    contractName: 'FIFOMarket',
    hre,
    signer,
  }) as Promise<FIFOMarket>;
};
