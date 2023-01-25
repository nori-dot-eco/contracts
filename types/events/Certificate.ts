/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalEvent,
  ApprovalForAllEvent,
  ConsecutiveTransferEvent,
  InitializedEvent,
  PausedEvent,
  CreateCertificateEvent,
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
    name: 'Approval';
  };
  ApprovalForAll: {
    args: ApprovalForAllEvent['args'];
    name: 'ApprovalForAll';
  };
  ConsecutiveTransfer: {
    args: ConsecutiveTransferEvent['args'];
    name: 'ConsecutiveTransfer';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'Initialized';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'Paused';
  };
  ReceiveRemovalBatch: {
    args: CreateCertificateEvent['args'];
    name: 'ReceiveRemovalBatch';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent['args'];
    name: 'RegisterContractAddresses';
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

export type CertificateEvents = ContractEvents<CertificateEventMap>;
