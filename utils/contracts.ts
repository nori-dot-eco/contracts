import { Contract } from 'ethers';

import type { BridgedPolygonNORI, LockedNORI } from '../typechain-types';
import type { networks } from '../config/networks';

import * as contractsConfig from '@/contracts.json';
import { abi as bridgedPolygonNoriAbi } from '@/artifacts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json';
import { abi as lockedNoriAbi } from '@/artifacts/LockedNORI.sol/LockedNORI.json';

export const getBridgedPolygonNori = ({
  signer,
  network,
}: {
  signer: ConstructorParameters<typeof Contract>[2];
  network: keyof typeof networks;
}): BridgedPolygonNORI => {
  const contractsForNetwork = contractsConfig[network];
  if (!('BridgedPolygonNORI' in contractsForNetwork)) {
    throw new Error(`Unsupported network: ${network}`);
  }
  const bridgedPolygonNori = new Contract(
    contractsForNetwork.BridgedPolygonNORI.proxyAddress,
    bridgedPolygonNoriAbi,
    signer
  ) as BridgedPolygonNORI;
  return bridgedPolygonNori;
};

export const getLockedNori = ({
  signer,
  network,
}: {
  signer: ConstructorParameters<typeof Contract>[2];
  network: keyof typeof networks;
}): LockedNORI => {
  const contractsForNetwork = contractsConfig[network];
  if (!('LockedNORI' in contractsForNetwork)) {
    throw new Error(`Unsupported network: ${network}`);
  }
  const lockedNori = new Contract(
    contractsForNetwork.LockedNORI.proxyAddress,
    lockedNoriAbi,
    signer
  ) as LockedNORI;
  return lockedNori;
};
