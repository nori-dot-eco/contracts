import { abi as removalAbi } from '@/artifacts/Removal.sol/Removal.json';
import { abi as marketAbi } from '@/artifacts/Market.sol/Market.json';
import { abi as restrictedNoriAbi } from '@/artifacts/RestrictedNORI.sol/RestrictedNORI.json';
import { abi as bridgedPolygonNoriAbi } from '@/artifacts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json';
import { abi as lockedNoriAbi } from '@/artifacts/LockedNORI.sol/LockedNORI.json';
import { abi as certificateAbi } from '@/artifacts/Certificate.sol/Certificate.json';
import { abi as noriAbi } from '@/artifacts/NORI.sol/NORI.json';

export const CONTRACT_NAME_TO_ABI = {
  Removal: removalAbi,
  NORI: noriAbi,
  BridgedPolygonNORI: bridgedPolygonNoriAbi,
  Market: marketAbi,
  LockedNORI: lockedNoriAbi,
  RestrictedNORI: restrictedNoriAbi,
  Certificate: certificateAbi,
} as const;
