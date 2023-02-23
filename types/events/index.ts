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

export type ContractWithEvents = Exclude<
  Contracts[keyof Omit<
    Contracts,
    'NoriUSDC' | 'LockedNORILibTestHarness' | 'RemovalTestHarness'
  >],
  undefined
>;

export type ContractEventInterface<TInterface extends ContractWithEvents> =
  TInterface extends Removal
    ? RemovalEvents
    : TInterface extends Market
    ? MarketEvents
    : TInterface extends LockedNORI
    ? LockedNORIEvents
    : TInterface extends NORI
    ? NORIEvents
    : TInterface extends BridgedPolygonNORI
    ? BridgedPolygonNORIEvents
    : TInterface extends Certificate
    ? CertificateEvents
    : TInterface extends RestrictedNORI
    ? RestrictedNORIEvents
    : never;

export type ContractEventNames<TInterface extends ContractWithEvents> =
  ContractEventInterface<TInterface>['name'];

export type NamedLogs<
  TContract extends ContractWithEvents,
  TEventNames extends ContractEventNames<TContract>[] = Exclude<
    ContractEventNames<TContract>,
    undefined
  >[]
> = Extract<
  ContractEventInterface<TContract>,
  {
    name: TEventNames[number];
    args: ContractEventInterface<TContract>['args'];
  }
>[];
