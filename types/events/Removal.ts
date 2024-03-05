/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type { BigNumber } from 'ethers';

import type {
  ApprovalForAllEvent,
  InitializedEvent,
  MigrateEvent,
  RetireEvent,
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
    args: ApprovalForAllEvent['args'];
  };
  Initialized: {
    name: 'Initialized';
    args: InitializedEvent['args'];
  };
  Migrate: {
    name: 'Migrate';
    args: MigrateEvent['args'];
  };
  Retire: {
    name: 'Retire';
    args: RetireEvent['args'];
  };
  Paused: {
    name: 'Paused';
    args: PausedEvent['args'];
  };
  RegisterContractAddresses: {
    name: 'RegisterContractAddresses';
    args: RegisterContractAddressesEvent['args'];
  };
  ReleaseRemoval: {
    name: 'ReleaseRemoval';
    args: ReleaseRemovalEvent['args'];
  };
  RoleAdminChanged: {
    name: 'RoleAdminChanged';
    args: RoleAdminChangedEvent['args'];
  };
  RoleGranted: {
    name: 'RoleGranted';
    args: RoleGrantedEvent['args'];
  };
  RoleRevoked: {
    name: 'RoleRevoked';
    args: RoleRevokedEvent['args'];
  };
  SetHoldbackPercentage: {
    name: 'SetHoldbackPercentage';
    args: SetHoldbackPercentageEvent['args'];
  };
  TransferBatch: {
    name: 'TransferBatch';
    /**
     * `args.values` is remapped to `args.vals` due to a limitation of javascript.
     *
     * @see https://github.com/ethers-io/ethers.js/discussions/3542#discussioncomment-4214097
     */
    args: Omit<TransferBatchEvent['args'], 'values'> & {
      vals: TransferBatchEvent['args']['values'] extends BigNumber[]
        ? BigNumber[]
        : never;
    };
  };
  TransferSingle: {
    name: 'TransferSingle';
    args: TransferSingleEvent['args'];
  };
  URI: {
    name: 'URI';
    args: URIEvent['args'];
  };
  Unpaused: {
    name: 'Unpaused';
    args: UnpausedEvent['args'];
  };
}

export type RemovalEvents = ContractEvents<RemovalEventMap>;
