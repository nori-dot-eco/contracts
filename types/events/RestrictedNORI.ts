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
    args: ApprovalForAllEvent['args'];
    name: 'ApprovalForAllEvent';
  };
  ClaimTokens: {
    args: ClaimTokensEvent['args'];
    name: 'ClaimTokensEvent';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'PausedEvent';
  };
  RevokeTokens: {
    args: RevokeTokensEvent['args'];
    name: 'RevokeTokensEvent';
  };
  RoleAdminChanged: {
    args: RoleAdminChangedEvent['args'];
    name: 'RoleAdminChangedEvent';
  };
  RoleGranted: {
    args: RoleGrantedEvent['args'];
    name: 'RoleGrantedEvent';
  };
  RoleRevoked: {
    args: RoleRevokedEvent['args'];
    name: 'RoleRevokedEvent';
  };
  ScheduleCreated: {
    args: ScheduleCreatedEvent['args'];
    name: 'ScheduleCreatedEvent';
  };
  TransferBatch: {
    args: TransferBatchEvent['args'];
    name: 'TransferBatchEvent';
  };
  TransferSingle: {
    args: TransferSingleEvent['args'];
    name: 'TransferSingleEvent';
  };
  URI: {
    args: URIEvent['args'];
    name: 'URIEvent';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'UnpausedEvent';
  };
}

export type RestrictedNORIEvents = ContractEvents<RestrictedNORIEventMap>;
