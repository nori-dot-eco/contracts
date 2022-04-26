import { Contract } from 'ethers';

import type { BridgedPolygonNORI, LockedNORI } from '../typechain-types';
import { Certificate } from '../typechain-types/Certificate';

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
    contract.connect(signer);
  }
  return contract;
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
  }) as Promise<BridgedPolygonNORI>;
};

export const getLockedNori = async ({
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
