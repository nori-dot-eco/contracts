/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalForAllEvent,
  ClaimTokensEvent,
  InitializedEvent,
  PausedEvent,
  RevokeTokensEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  ScheduleCreatedEvent,
  TransferBatchEvent,
  TransferSingleEvent,
  URIEvent,
  UnpausedEvent,
} from '../typechain-types/artifacts/contracts/RestrictedNORI';

import type { ContractEvents } from './contract-events';

export interface RestrictedNORIEventMap {
  ApprovalForAll: {
    args: ApprovalForAllEvent;
    name: 'ApprovalForAllEvent';
  };
  ClaimTokens: {
    args: ClaimTokensEvent;
    name: 'ClaimTokensEvent';
  };
  Initialized: {
    args: InitializedEvent;
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent;
    name: 'PausedEvent';
  };
  RevokeTokens: {
    args: RevokeTokensEvent;
    name: 'RevokeTokensEvent';
  };
  RoleAdminChanged: {
    args: RoleAdminChangedEvent;
    name: 'RoleAdminChangedEvent';
  };
  RoleGranted: {
    args: RoleGrantedEvent;
    name: 'RoleGrantedEvent';
  };
  RoleRevoked: {
    args: RoleRevokedEvent;
    name: 'RoleRevokedEvent';
  };
  ScheduleCreated: {
    args: ScheduleCreatedEvent;
    name: 'ScheduleCreatedEvent';
  };
  TransferBatch: {
    args: TransferBatchEvent;
    name: 'TransferBatchEvent';
  };
  TransferSingle: {
    args: TransferSingleEvent;
    name: 'TransferSingleEvent';
  };
  URI: {
    args: URIEvent;
    name: 'URIEvent';
  };
  Unpaused: {
    args: UnpausedEvent;
    name: 'UnpausedEvent';
  };
}

export type RestrictedNORIEvents = ContractEvents<RestrictedNORIEventMap>;
