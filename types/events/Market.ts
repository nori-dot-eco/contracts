/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  AddRemovalEvent,
  AddSupplierEvent,
  InitializedEvent,
  PausedEvent,
  RegisterContractAddressesEvent,
  RemoveSupplierEvent,
  RestrictedNORIMintFailureEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  SetPriceMultipleEvent,
  SetPriorityRestrictedThresholdEvent,
  SetPurchasingTokenEvent,
  SkipRestrictedNORIERC20TransferEvent,
  UnpausedEvent,
  UpdateNoriFeePercentageEvent,
  UpdateNoriFeeWalletAddressEvent,
} from '../typechain-types/artifacts/contracts/Market';

import type { ContractEvents } from './contract-events';

export interface MarketEventMap {
  AddRemoval: {
    args: AddRemovalEvent;
    name: 'AddRemovalEvent';
  };
  AddSupplier: {
    args: AddSupplierEvent;
    name: 'AddSupplierEvent';
  };
  Initialized: {
    args: InitializedEvent;
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent;
    name: 'PausedEvent';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent;
    name: 'RegisterContractAddressesEvent';
  };
  RemoveSupplier: {
    args: RemoveSupplierEvent;
    name: 'RemoveSupplierEvent';
  };
  RestrictedNORIMintFailure: {
    args: RestrictedNORIMintFailureEvent;
    name: 'RestrictedNORIMintFailureEvent';
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
  SetPriceMultiple: {
    args: SetPriceMultipleEvent;
    name: 'SetPriceMultipleEvent';
  };
  SetPriorityRestrictedThresholdE: {
    args: SetPriorityRestrictedThresholdEvent;
    name: 'SetPriorityRestrictedThresholdEvent';
  };
  SetPurchasingToken: {
    args: SetPurchasingTokenEvent;
    name: 'SetPurchasingTokenEvent';
  };
  SkipRestrictedNORIERC20Transfer: {
    args: SkipRestrictedNORIERC20TransferEvent;
    name: 'SkipRestrictedNORIERC20TransferEvent';
  };
  Unpaused: {
    args: UnpausedEvent;
    name: 'UnpausedEvent';
  };
  UpdateNoriFeePercentage: {
    args: UpdateNoriFeePercentageEvent;
    name: 'UpdateNoriFeePercentageEvent';
  };
  UpdateNoriFeeWalletAddress: {
    args: UpdateNoriFeeWalletAddressEvent;
    name: 'UpdateNoriFeeWalletAddressEvent';
  };
}

export type MarketEvents = ContractEvents<MarketEventMap>;
