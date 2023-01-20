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
    args: ApprovalEvent['args'];
    name: 'Approval';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'Initialized';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'Paused';
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
  Transfer: {
    args: TransferEvent['args'];
    name: 'Transfer';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'Unpaused';
  };
}

export type NORIEvents = ContractEvents<NORIEventMap>;
