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
    name: 'ApprovalForAll';
  };
  ClaimTokens: {
    args: ClaimTokensEvent['args'];
    name: 'ClaimTokens';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'Initialized';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'Paused';
  };
  RevokeTokens: {
    args: RevokeTokensEvent['args'];
    name: 'RevokeTokens';
  };
  RoleAdminChanged: {
    args: RoleAdminChangedEvent['args'];
    name: 'RoleAdminChanged';
  };
  RoleGranted: {
    args: RoleGrantedEvent['args'];
    name: 'RoleGranted';
  };
  RoleRevoked: {
    args: RoleRevokedEvent['args'];
    name: 'RoleRevoked';
  };
  ScheduleCreated: {
    args: ScheduleCreatedEvent['args'];
    name: 'ScheduleCreated';
  };
  TransferBatch: {
    args: TransferBatchEvent['args'];
    name: 'TransferBatch';
  };
  TransferSingle: {
    args: TransferSingleEvent['args'];
    name: 'TransferSingle';
  };
  URI: {
    args: URIEvent['args'];
    name: 'URI';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'Unpaused';
  };
}

export type RestrictedNORIEvents = ContractEvents<RestrictedNORIEventMap>;
