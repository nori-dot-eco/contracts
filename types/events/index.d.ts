/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type { LogDescription } from 'ethers/lib/utils';

import type {
  ApprovalForAllEvent as RemovalApprovalForAllEvent,
  InitializedEvent as RemovalInitializedEvent,
  MigrateEvent as RemovalMigrateEvent,
  PausedEvent as RemovalPausedEvent,
  ReleaseRemovalEvent as RemovalReleaseRemovalEvent,
  RoleAdminChangedEvent as RemovalRoleAdminChangedEvent,
  RoleGrantedEvent as RemovalRoleGrantedEvent,
  RoleRevokedEvent as RemovalRoleRevokedEvent,
  SetHoldbackPercentageEvent as RemovalSetHoldbackPercentageEvent,
  TransferBatchEvent as RemovalTransferBatchEvent,
  TransferSingleEvent as RemovalTransferSingleEvent,
  URIEvent as RemovalURIEvent,
  UnpausedEvent as RemovalUnpausedEvent,
  RegisterContractAddressesEvent as RemovalRegisterContractAddressesEvent,
} from '@/typechain-types/artifacts/contracts/Removal';
import type {
  Removal,
  Market,
  LockedNORI,
  NORI,
  BridgedPolygonNORI,
  Certificate,
  RestrictedNORI,
} from '@/typechain-types';

export type ContractEventInterfaceFromType<T> = T extends Removal
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

export type UntypedLog = Omit<LogDescription, 'args' | 'name'>;

export interface LockedNORIEventMap {
  ApprovalForAll: undefined; // todo
}

export interface NORIEventMap {
  ApprovalForAll: undefined; // todo
}

export interface RestrictedNORIEventMap {
  ApprovalForAll: undefined; // todo
}

export interface CertificateEventMap {
  ApprovalForAll: undefined; // todo
}

export interface MarketEventMap {
  ApprovalForAll: undefined; // todo
}

export interface BridgedPolygonNORIEventMap {
  ApprovalForAll: undefined; // todo
}

export interface RemovalEventMap {
  ApprovalForAll: {
    name: 'ApprovalForAll';
    args: RemovalApprovalForAllEvent;
  };
  Initialized: {
    name: 'Initialized';
    args: RemovalInitializedEvent;
  };
  Migrate: {
    name: 'Migrate';
    args: RemovalMigrateEvent;
  };
  Paused: {
    name: 'Paused';
    args: RemovalPausedEvent;
  };
  RegisterContractAddresses: {
    name: 'RegisterContractAddresses';
    args: RemovalRegisterContractAddressesEvent;
  };
  ReleaseRemoval: {
    name: 'ReleaseRemoval';
    args: RemovalReleaseRemovalEvent;
  };
  RoleAdminChanged: {
    name: 'RoleAdminChanged';
    args: RemovalRoleAdminChangedEvent;
  };
  RoleGranted: {
    name: 'RoleGranted';
    args: RemovalRoleGrantedEvent;
  };
  RoleRevoked: {
    name: 'RoleRevoked';
    args: RemovalRoleRevokedEvent;
  };
  SetHoldbackPercentage: {
    name: 'SetHoldbackPercentage';
    args: RemovalSetHoldbackPercentageEvent;
  };
  TransferBatch: {
    name: 'TransferBatch';
    args: RemovalTransferBatchEvent;
  };
  TransferSingle: {
    name: 'TransferSingle';
    args: RemovalTransferSingleEvent;
  };
  URI: {
    name: 'URI';
    args: RemovalURIEvent;
  };
  Unpaused: {
    name: 'Unpaused';
    args: RemovalUnpausedEvent;
  };
}

export type ContractEvents<TContractEventMap> = {
  [TKey in keyof TContractEventMap]: UntypedLog & TContractEventMap[TKey];
}[keyof TContractEventMap];

export type RemovalEvents = ContractEvents<RemovalEventMap>;

export type MarketEvents = ContractEvents<MarketEventMap>;

export type CertificateEvents = ContractEvents<CertificateEventMap>;

export type BridgedPolygonNORIEvents =
  ContractEvents<BridgedPolygonNORIEventMap>;

export type NORIEvents = ContractEvents<NORIEventMap>;

export type RestrictedNORIEvents = ContractEvents<RestrictedNORIEventMap>;

export type LockedNORIEvents = ContractEvents<LockedNORIEventMap>;
