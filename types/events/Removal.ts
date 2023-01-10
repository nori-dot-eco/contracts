/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalForAllEvent,
  InitializedEvent,
  MigrateEvent,
  PausedEvent,
  ReleaseRemovalEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  SetHoldbackPercentageEvent,
  TransferBatchEvent,
  TransferSingleEvent,
  URIEvent,
  UnpausedEvent,
  RegisterContractAddressesEvent,
} from '../typechain-types/artifacts/contracts/Removal';

import type { ContractEvents } from './contract-events';

export interface RemovalEventMap {
  ApprovalForAll: {
    name: 'ApprovalForAll';
    args: ApprovalForAllEvent;
  };
  Initialized: {
    name: 'Initialized';
    args: InitializedEvent;
  };
  Migrate: {
    name: 'Migrate';
    args: MigrateEvent;
  };
  Paused: {
    name: 'Paused';
    args: PausedEvent;
  };
  RegisterContractAddresses: {
    name: 'RegisterContractAddresses';
    args: RegisterContractAddressesEvent;
  };
  ReleaseRemoval: {
    name: 'ReleaseRemoval';
    args: ReleaseRemovalEvent;
  };
  RoleAdminChanged: {
    name: 'RoleAdminChanged';
    args: RoleAdminChangedEvent;
  };
  RoleGranted: {
    name: 'RoleGranted';
    args: RoleGrantedEvent;
  };
  RoleRevoked: {
    name: 'RoleRevoked';
    args: RoleRevokedEvent;
  };
  SetHoldbackPercentage: {
    name: 'SetHoldbackPercentage';
    args: SetHoldbackPercentageEvent;
  };
  TransferBatch: {
    name: 'TransferBatch';
    args: TransferBatchEvent;
  };
  TransferSingle: {
    name: 'TransferSingle';
    args: TransferSingleEvent;
  };
  URI: {
    name: 'URI';
    args: URIEvent;
  };
  Unpaused: {
    name: 'Unpaused';
    args: UnpausedEvent;
  };
}

export type RemovalEvents = ContractEvents<RemovalEventMap>;
