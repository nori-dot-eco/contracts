/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalEvent,
  ApprovalForAllEvent,
  ConsecutiveTransferEvent,
  InitializedEvent,
  PausedEvent,
  ReceiveRemovalBatchEvent,
  RegisterContractAddressesEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  TransferEvent,
  UnpausedEvent,
} from '../typechain-types/artifacts/contracts/Certificate';

import type { ContractEvents } from './contract-events';

export interface CertificateEventMap {
  Approval: {
    args: ApprovalEvent['args'];
    name: 'ApprovalEvent';
  };
  ApprovalForAll: {
    args: ApprovalForAllEvent['args'];
    name: 'ApprovalForAllEvent';
  };
  ConsecutiveTransfer: {
    args: ConsecutiveTransferEvent['args'];
    name: 'ConsecutiveTransferEvent';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'PausedEvent';
  };
  ReceiveRemovalBatch: {
    args: ReceiveRemovalBatchEvent['args'];
    name: 'ReceiveRemovalBatchEvent';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent['args'];
    name: 'RegisterContractAddressesEvent';
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

export type CertificateEvents = ContractEvents<CertificateEventMap>;
