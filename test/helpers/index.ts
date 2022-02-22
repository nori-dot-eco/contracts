import type {
  Certificate,
  FIFOMarket,
  Removal,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
} from '../../typechain-types';

export * from './chai';
export * from './interfaces';
export * from './polygon';
export interface ContractInstances {
  nori: NORI;
  bpNori: BridgedPolygonNORI;
  removal: Removal;
  certificate: Certificate;
  fifoMarket: FIFOMarket;
  lNori: LockedNORI;
}
