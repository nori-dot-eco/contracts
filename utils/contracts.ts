import type { Contract } from 'ethers';

import type {
  MockERC1155PresetPausableNonTransferrable,
  MockCertificate,
} from '@/typechain-types/contracts/mocks';
import type {
  BridgedPolygonNORI,
  Certificate,
  FIFOMarket,
  LockedNORIV2,
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
  LockedNORIV2?: LockedNORIV2;
  RestrictedNORI?: RestrictedNORI;
  Certificate?: Certificate;
  ScheduleTestHarness?: ScheduleTestHarness;
  RemovalTestHarness?: RemovalTestHarness;
  MockCertificate?: MockCertificate; // todo key remapping
  MockERC1155PresetPausableNonTransferrable?: MockERC1155PresetPausableNonTransferrable;
}

export const getContract = async <
  TContract extends Contracts[keyof Contracts]
>({
  contractName,
  hre,
  signer,
}: {
  contractName:
   TContract extends BridgedPolygonNORI
    ? 'BridgedPolygonNORI'
    : TContract extends LockedNORIV2
    ? 'LockedNORIV2'
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
    : TContract extends MockCertificate
    ? 'MockCertificate'
    : TContract extends MockERC1155PresetPausableNonTransferrable
    ? 'MockERC1155PresetPausableNonTransferrable'
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

// export const getLockedNORI = ({ // todo import from forked repo
//   hre,
//   signer,
// }: {
//   hre: CustomHardHatRuntimeEnvironment;
//   signer?: ConstructorParameters<typeof Contract>[2];
// }): Promise<LockedNORI> =>
//   getContract({
//     contractName: 'LockedNORI',
//     hre,
//     signer,
//   });

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

export const getMockCertificate = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<MockCertificate> =>
  getContract({
    contractName: 'MockCertificate' as keyof Contracts[keyof Contracts],
    hre,
    signer,
  });

export const getMockERC1155PresetPausableNonTransferrable = async ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Promise<MockERC1155PresetPausableNonTransferrable> =>
  getContract({
    contractName:
      'MockERC1155PresetPausableNonTransferrable' as keyof Contracts[keyof Contracts],
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
    // LockedNORI: deployments.LockedNORI?.address
    //   ? await getLockedNORI({ hre })
    //   : undefined, // todo import from forked repo
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
    MockCertificate: deployments.MockCertificate?.address
      ? await getMockCertificate({ hre })
      : undefined,
    MockERC1155PresetPausableNonTransferrable: deployments
      .MockERC1155PresetPausableNonTransferrable?.address
      ? await getMockERC1155PresetPausableNonTransferrable({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};
