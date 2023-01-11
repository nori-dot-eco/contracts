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
    args: AddRemovalEvent['args'];
    name: 'AddRemovalEvent';
  };
  AddSupplier: {
    args: AddSupplierEvent['args'];
    name: 'AddSupplierEvent';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'InitializedEvent';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'PausedEvent';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent['args'];
    name: 'RegisterContractAddressesEvent';
  };
  RemoveSupplier: {
    args: RemoveSupplierEvent['args'];
    name: 'RemoveSupplierEvent';
  };
  RestrictedNORIMintFailure: {
    args: RestrictedNORIMintFailureEvent['args'];
    name: 'RestrictedNORIMintFailureEvent';
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
  SetPriceMultiple: {
    args: SetPriceMultipleEvent['args'];
    name: 'SetPriceMultipleEvent';
  };
  SetPriorityRestrictedThresholdE: {
    args: SetPriorityRestrictedThresholdEvent['args'];
    name: 'SetPriorityRestrictedThresholdEvent';
  };
  SetPurchasingToken: {
    args: SetPurchasingTokenEvent['args'];
    name: 'SetPurchasingTokenEvent';
  };
  SkipRestrictedNORIERC20Transfer: {
    args: SkipRestrictedNORIERC20TransferEvent['args'];
    name: 'SkipRestrictedNORIERC20TransferEvent';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'UnpausedEvent';
  };
  UpdateNoriFeePercentage: {
    args: UpdateNoriFeePercentageEvent['args'];
    name: 'UpdateNoriFeePercentageEvent';
  };
  UpdateNoriFeeWalletAddress: {
    args: UpdateNoriFeeWalletAddressEvent['args'];
    name: 'UpdateNoriFeeWalletAddressEvent';
  };
}

export type MarketEvents = ContractEvents<MarketEventMap>;
