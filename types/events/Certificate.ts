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

import type { ContractEvents } from './events/contract-events';

export interface CertificateEventMap {
  Approval: {
    args: ApprovalEvent;
    name: 'ApprovalEvent';
  };
  ApprovalForAll: {
    args: ApprovalForAllEvent;
    name: 'ApprovalForAllEvent';
  };
  ConsecutiveTransfer: {
    args: ConsecutiveTransferEvent;
    name: 'ConsecutiveTransferEvent';
  };
  Initialized: {
    args: InitializedEvent;
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent;
    name: 'PausedEvent';
  };
  ReceiveRemovalBatch: {
    args: ReceiveRemovalBatchEvent;
    name: 'ReceiveRemovalBatchEvent';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent;
    name: 'RegisterContractAddressesEvent';
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

export type CertificateEvents = ContractEvents<CertificateEventMap>;
