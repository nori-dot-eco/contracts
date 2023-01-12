import type {
  Removal,
  Market,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  Certificate,
  RestrictedNORI,
} from '../typechain-types/index';
import type { Contracts } from '../contracts';

import type { BridgedPolygonNORIEvents } from './BridgedPolygonNORI';
import type { RemovalEvents } from './Removal';
import type { NORIEvents } from './NORI';
import type { LockedNORIEvents } from './LockedNORI';
import type { MarketEvents } from './Market';
import type { CertificateEvents } from './Certificate';
import type { RestrictedNORIEvents } from './RestrictedNORI';

export type ContractWithEvents = Contracts[keyof Contracts];

export type ContractEventInterface<T extends ContractWithEvents> =
  T extends Removal
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
