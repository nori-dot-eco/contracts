/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalEvent,
  InitializedEvent,
  PausedEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  TransferEvent,
  UnpausedEvent,
} from '../typechain-types/artifacts/contracts/NORI';

import type { ContractEvents } from './contract-events';

export interface NORIEventMap {
  Approval: {
    args: ApprovalEvent;
    name: 'ApprovalEvent';
  };
  Initialized: {
    args: InitializedEvent;
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent;
    name: 'PausedEvent';
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
  Transfer: {
    args: TransferEvent;
    name: 'TransferEvent';
  };
  Unpaused: {
    args: UnpausedEvent;
    name: 'UnpausedEvent';
  };
}

export type NORIEvents = ContractEvents<NORIEventMap>;
