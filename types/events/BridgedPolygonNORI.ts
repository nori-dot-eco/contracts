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
} from '../typechain-types/artifacts/contracts/BridgedPolygonNORI';

import type { ContractEvents } from './contract-events';

export interface BridgedPolygonNORIEventMap {
  Approval: {
    args: ApprovalEvent['args'];
    name: 'ApprovalEvent';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'PausedEvent';
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
  Transfer: {
    args: TransferEvent['args'];
    name: 'TransferEvent';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'UnpausedEvent';
  };
}

export type BridgedPolygonNORIEvents =
  ContractEvents<BridgedPolygonNORIEventMap>;
