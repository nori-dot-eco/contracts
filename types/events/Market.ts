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
    name: 'AddRemoval';
  };
  AddSupplier: {
    args: AddSupplierEvent['args'];
    name: 'AddSupplier';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'Initialized';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'Paused';
  };
  RegisterContractAddresses: {
    args: RegisterContractAddressesEvent['args'];
    name: 'RegisterContractAddresses';
  };
  RemoveSupplier: {
    args: RemoveSupplierEvent['args'];
    name: 'RemoveSupplier';
  };
  RestrictedNORIMintFailure: {
    args: RestrictedNORIMintFailureEvent['args'];
    name: 'RestrictedNORIMintFailure';
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
  SetPriceMultiple: {
    args: SetPriceMultipleEvent['args'];
    name: 'SetPriceMultiple';
  };
  SetPriorityRestrictedThresholdE: {
    args: SetPriorityRestrictedThresholdEvent['args'];
    name: 'SetPriorityRestrictedThreshold';
  };
  SetPurchasingToken: {
    args: SetPurchasingTokenEvent['args'];
    name: 'SetPurchasingToken';
  };
  SkipRestrictedNORIERC20Transfer: {
    args: SkipRestrictedNORIERC20TransferEvent['args'];
    name: 'SkipRestrictedNORIERC20Transfer';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'Unpaused';
  };
  UpdateNoriFeePercentage: {
    args: UpdateNoriFeePercentageEvent['args'];
    name: 'UpdateNoriFeePercentage';
  };
  UpdateNoriFeeWalletAddress: {
    args: UpdateNoriFeeWalletAddressEvent['args'];
    name: 'UpdateNoriFeeWalletAddress';
  };
}

export type MarketEvents = ContractEvents<MarketEventMap>;
