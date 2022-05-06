import { Contract } from 'ethers';
import type {
  BridgedPolygonNORI,
  Certificate,
  FIFOMarket,
  LockedNORI,
  NORI,
  Removal,
  ScheduleTestHarness,
} from '@/typechain-types';

export interface Contracts {
  Removal?: Removal;
  NORI?: NORI;
  BridgedPolygonNORI?: BridgedPolygonNORI;
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
    NORI: deployments['NORI']?.address ? getNORI({ hre }) : undefined,
    BridgedPolygonNORI: deployments['BridgedPolygonNORI']?.address
      ? getBridgedPolygonNori({ hre })
      : undefined,
    LockedNORI: deployments['LockedNORI']?.address
      ? getLockedNORI({ hre })
      : undefined,
    FIFOMarket: deployments['FIFOMarket']?.address
      ? getFIFOMarket({ hre })
      : undefined,
    Removal: deployments['Removal']?.address ? getRemoval({ hre }) : undefined,
    Certificate: deployments['Certificate']?.address
      ? getCertificate({ hre })
      : undefined,
  } as Required<Contracts>;
  return contracts;
};

/**
 * getContract and the specialized helpers instatiate ethers Contract instances.
 *
 * They are synchronous to make life easier in front-end code.
 *
 */

export const getContract = <TContract extends Contracts[keyof Contracts]>({
  contractName,
  hre,
  signer,
}: {
  contractName: TContract extends BridgedPolygonNORI
    ? 'BridgedPolygonNORI'
    : TContract extends LockedNORI
    ? 'LockedNORI'
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
}): TContract => {
  let contract: TContract | undefined;
  hre.deployments.get(contractName).then((deployment) => {
    hre.ethers
      .getContractAt(contractName, deployment.address)
      .then((c) => (contract = c as TContract));
  });
  if (!contract) {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }
  return (signer != null ? contract.connect(signer) : contract) as TContract;
};

export const getBridgedPolygonNori = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): BridgedPolygonNORI => {
  return getContract({
    contractName: 'BridgedPolygonNORI',
    hre,
    signer,
  });
};

export const getNORI = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): NORI => {
  return getContract({
    contractName: 'NORI',
    hre,
    signer,
  });
};

export const getLockedNORI = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): LockedNORI => {
  return getContract({
    contractName: 'LockedNORI',
    hre,
    signer,
  });
};

export const getCertificate = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Certificate => {
  return getContract({
    contractName: 'Certificate',
    hre,
    signer,
  });
};

export const getRemoval = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): Removal => {
  return getContract({
    contractName: 'Removal',
    hre,
    signer,
  });
};

export const getFIFOMarket = ({
  hre,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  signer?: ConstructorParameters<typeof Contract>[2];
}): FIFOMarket => {
  return getContract({
    contractName: 'FIFOMarket',
    hre,
    signer,
  });
};
