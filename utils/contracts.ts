import type { Contract } from 'ethers';

import type {
  BridgedPolygonNORI,
  Certificate,
  FIFOMarket,
  LockedNORI,
  SupplierVestingNORI,
  NORI,
  Removal,
  ScheduleTestHarness,
} from '@/typechain-types';

export interface Contracts {
  Removal?: Removal;
  NORI?: NORI;
  BridgedPolygonNORI?: BridgedPolygonNORI;
  SupplierVestingNORI?: SupplierVestingNORI;
  FIFOMarket?: FIFOMarket;
  LockedNORI?: LockedNORI;
  Certificate?: Certificate;
  ScheduleTestHarness?: ScheduleTestHarness;
}

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
    SupplierVestingNORI: deployments.SupplierVestingNORI?.address
      ? await getSupplierVestingNORI({ hre })
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
    ScheduleTestHarness: deployments.ScheduleTestHarness?.address
      ? await getScheduleTestHarness({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};

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
    : TContract extends SupplierVestingNORI
    ? 'SupplierVestingNORI'
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
  return (signer != null ? contract.connect(signer) : contract) as TContract;
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

export const getSupplierVestingNORI = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<SupplierVestingNORI> =>
  getContract({
    contractName: 'SupplierVestingNORI',
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

export const getScheduleTestHarness = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<ScheduleTestHarness> =>
  getContract({
    contractName: 'ScheduleTestHarness',
    hre,
    signer,
  });
