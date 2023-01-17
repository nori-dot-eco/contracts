import { abi as removalAbi } from '../artifacts/contracts/Removal.sol/Removal.json';
import { abi as marketAbi } from '../artifacts/contracts/Market.sol/Market.json';
import { abi as restrictedNoriAbi } from '../artifacts/contracts/RestrictedNORI.sol/RestrictedNORI.json';
import { abi as bridgedPolygonNoriAbi } from '../artifacts/contracts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json';
import { abi as lockedNoriAbi } from '../artifacts/contracts/LockedNORI.sol/LockedNORI.json';
import { abi as certificateAbi } from '../artifacts/contracts/Certificate.sol/Certificate.json';
import { abi as noriAbi } from '../artifacts/contracts/NORI.sol/NORI.json';

export const CONTRACT_NAME_TO_ABI = {
  Removal: removalAbi,
  NORI: noriAbi,
  BridgedPolygonNORI: bridgedPolygonNoriAbi,
  Market: marketAbi,
  LockedNORI: lockedNoriAbi,
  RestrictedNORI: restrictedNoriAbi,
  Certificate: certificateAbi,
} as const;
