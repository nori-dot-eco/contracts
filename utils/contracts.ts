import type { Contract } from 'ethers';

import type {
  BridgedPolygonNORI,
  Certificate,
  FIFOMarket,
  LockedNORI,
  RestrictedNORI,
  NORI,
  Removal,
  ScheduleTestHarness,
  RemovalTestHarness,
} from '@/typechain-types';

export interface Contracts {
  Removal?: Removal;
  NORI?: NORI;
  BridgedPolygonNORI?: BridgedPolygonNORI;
  FIFOMarket?: FIFOMarket;
  LockedNORI?: LockedNORI;
  RestrictedNORI?: RestrictedNORI;
  Certificate?: Certificate;
  ScheduleTestHarness?: ScheduleTestHarness;
  RemovalTestHarness?: RemovalTestHarness;
}

export const getContract = async <
  TContract extends Contracts[keyof Contracts]
>({
  contractName,
  hre,
  signer,
}: {
  contractName: TContract extends BridgedPolygonNORI
    ? 'BridgedPolygonNORI'
    : TContract extends LockedNORI
    ? 'LockedNORI'
    : TContract extends RestrictedNORI
    ? 'RestrictedNORI'
    : TContract extends NORI
    ? 'NORI'
    : TContract extends Removal
    ? 'Removal'
    : TContract extends Certificate
    ? 'Certificate'
    : TContract extends FIFOMarket
    ? 'FIFOMarket'
    : TContract extends ScheduleTestHarness
    ? 'ScheduleTestHarness'
    : TContract extends RemovalTestHarness
    ? 'RemovalTestHarness'
    : never;
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<TContract> => {
  const deployment = await hre.deployments.get(contractName);
  const contract = await hre.ethers.getContractAt(
    contractName,
    deployment.address
  );
  if (!contract) {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }
  return (
    signer != undefined ? contract.connect(signer) : contract
  ) as TContract;
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

export const getFIFOMarket = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<FIFOMarket> =>
  getContract({
    contractName: 'FIFOMarket',
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
    FIFOMarket: deployments.FIFOMarket?.address
      ? await getFIFOMarket({ hre })
      : undefined,
    Removal: deployments.Removal?.address
      ? await getRemoval({ hre })
      : undefined,
    Certificate: deployments.Certificate?.address
      ? await getCertificate({ hre })
      : undefined,
    RemovalTestHarness: deployments.RemovalTestHarness?.address
      ? await getRemovalTestHarness({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};
