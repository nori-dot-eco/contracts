/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  Removal,
  Market,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  Certificate,
  RestrictedNORI,
} from '../typechain-types/index';

import type { BridgedPolygonNORIEvents } from './BridgedPolygonNORI';
import type { RemovalEvents } from './Removal';
import type { NORIEvents } from './NORI';
import type { LockedNORIEvents } from './LockedNORI';
import type { MarketEvents } from './Market';
import type { CertificateEvents } from './Certificate';
import type { RestrictedNORIEvents } from './RestrictedNORI';

export interface ContractsWithEvents {
  Removal: Removal;
  NORI: NORI;
  BridgedPolygonNORI: BridgedPolygonNORI;
  Market: Market;
  LockedNORI: LockedNORI;
  RestrictedNORI: RestrictedNORI;
  Certificate: Certificate;
}

export type ContractEventInterfaceFromType<
  T extends ContractsWithEvents[keyof ContractsWithEvents]
> = T extends Removal
  ? RemovalEvents
  : T extends Market
  ? MarketEvents
  : T extends LockedNORI
  ? LockedNORIEvents
  : T extends NORI
  ? NORIEvents
  : T extends BridgedPolygonNORI
  ? BridgedPolygonNORIEvents
  : T extends Certificate
  ? CertificateEvents
  : T extends RestrictedNORI
  ? RestrictedNORIEvents
  : never;
