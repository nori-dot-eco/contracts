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
    name: 'ApprovalEvent';
  };
  AuthorizedOperator: {
    args: AuthorizedOperatorEvent['args'];
    name: 'AuthorizedOperatorEvent';
  };
  Burned: {
    args: BurnedEvent['args'];
    name: 'BurnedEvent';
  };
  Initialized: {
    args: InitializedEvent['args'];
    name: 'InitializedEvent';
  };
  Minted: {
    args: MintedEvent['args'];
    name: 'MintedEvent';
  };
  Paused: {
    args: PausedEvent['args'];
    name: 'PausedEvent';
  };
  RevokedOperator: {
    args: RevokedOperatorEvent['args'];
    name: 'RevokedOperatorEvent';
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
  Sent: {
    args: SentEvent['args'];
    name: 'SentEvent';
  };
  SentBatch: {
    args: SentBatchEvent['args'];
    name: 'SentBatchEvent';
  };
  TokenGrantCreated: {
    args: TokenGrantCreatedEvent['args'];
    name: 'TokenGrantCreatedEvent';
  };
  TokenGrantCreatedBatchEven: {
    args: TokenGrantCreatedBatchEvent['args'];
    name: 'TokenGrantCreatedBatchEvent';
  };
  TokensClaimed: {
    args: TokensClaimedEvent['args'];
    name: 'TokensClaimedEvent';
  };
  Transfer: {
    args: TransferEvent['args'];
    name: 'TransferEvent';
  };
  UnderlyingTokenAddressUpdated: {
    args: UnderlyingTokenAddressUpdatedEvent['args'];
    name: 'UnderlyingTokenAddressUpdatedEvent';
  };
  Unpaused: {
    args: UnpausedEvent['args'];
    name: 'UnpausedEvent';
  };
  UnvestedTokensRevoked: {
    args: UnvestedTokensRevokedEvent['args'];
    name: 'UnvestedTokensRevokedEvent';
  };
}

export type LockedNORIEvents = ContractEvents<LockedNORIEventMap>;
