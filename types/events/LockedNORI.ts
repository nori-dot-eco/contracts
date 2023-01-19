/* eslint-disable @typescript-eslint/naming-convention -- events in this file match on-chain event names which are pascal case */
import type {
  ApprovalEvent,
  AuthorizedOperatorEvent,
  BurnedEvent,
  InitializedEvent,
  MintedEvent,
  PausedEvent,
  RevokedOperatorEvent,
  RoleAdminChangedEvent,
  RoleGrantedEvent,
  RoleRevokedEvent,
  SentEvent,
  SentBatchEvent,
  TokenGrantCreatedEvent,
  TokenGrantCreatedBatchEvent,
  TokensClaimedEvent,
  TransferEvent,
  UnderlyingTokenAddressUpdatedEvent,
  UnpausedEvent,
  UnvestedTokensRevokedEvent,
} from '../typechain-types/artifacts/contracts/LockedNORI';

import type { ContractEvents } from './contract-events';

export interface LockedNORIEventMap {
  Approval: {
    args: ApprovalEvent['args'];
    name: 'Approval';
  };
  AuthorizedOperator: {
    args: AuthorizedOperatorEvent['args'];
    name: 'AuthorizedOperator';
  };
  Burned: {
    args: BurnedEvent['args'];
    name: 'Burned';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'Initialized';
  };
  Minted: {
    args: MintedEvent['args'];
    name: 'Minted';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'Paused';
  };
  RevokedOperator: {
    args: RevokedOperatorEvent['args'];
    name: 'RevokedOperator';
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
  Sent: {
    args: SentEvent['args'];
    name: 'Sent';
  };
  SentBatch: {
    args: SentBatchEvent['args'];
    name: 'SentBatch';
  };
  TokenGrantCreated: {
    args: TokenGrantCreatedEvent['args'];
    name: 'TokenGrantCreated';
  };
  TokenGrantCreatedBatchEven: {
    args: TokenGrantCreatedBatchEvent['args'];
    name: 'TokenGrantCreatedBatch';
  };
  TokensClaimed: {
    args: TokensClaimedEvent['args'];
    name: 'TokensClaimed';
  };
  Transfer: {
    args: TransferEvent['args'];
    name: 'Transfer';
  };
  UnderlyingTokenAddressUpdated: {
    args: UnderlyingTokenAddressUpdatedEvent['args'];
    name: 'UnderlyingTokenAddressUpdated';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'Unpaused';
  };
  UnvestedTokensRevoked: {
    args: UnvestedTokensRevokedEvent['args'];
    name: 'UnvestedTokensRevoked';
  };
}

export type LockedNORIEvents = ContractEvents<LockedNORIEventMap>;
