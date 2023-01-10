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
    args: ApprovalEvent;
    name: 'ApprovalEvent';
  };
  AuthorizedOperator: {
    args: AuthorizedOperatorEvent;
    name: 'AuthorizedOperatorEvent';
  };
  Burned: {
    args: BurnedEvent;
    name: 'BurnedEvent';
  };
  Initialized: {
    args: InitializedEvent;
    name: 'InitializedEvent';
  };
  Minted: {
    args: MintedEvent;
    name: 'MintedEvent';
  };
  Paused: {
    args: PausedEvent;
    name: 'PausedEvent';
  };
  RevokedOperator: {
    args: RevokedOperatorEvent;
    name: 'RevokedOperatorEvent';
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
  Sent: {
    args: SentEvent;
    name: 'SentEvent';
  };
  SentBatch: {
    args: SentBatchEvent;
    name: 'SentBatchEvent';
  };
  TokenGrantCreated: {
    args: TokenGrantCreatedEvent;
    name: 'TokenGrantCreatedEvent';
  };
  TokenGrantCreatedBatchEven: {
    args: TokenGrantCreatedBatchEvent;
    name: 'TokenGrantCreatedBatchEvent';
  };
  TokensClaimed: {
    args: TokensClaimedEvent;
    name: 'TokensClaimedEvent';
  };
  Transfer: {
    args: TransferEvent;
    name: 'TransferEvent';
  };
  UnderlyingTokenAddressUpdated: {
    args: UnderlyingTokenAddressUpdatedEvent;
    name: 'UnderlyingTokenAddressUpdatedEvent';
  };
  Unpaused: {
    args: UnpausedEvent;
    name: 'UnpausedEvent';
  };
  UnvestedTokensRevoked: {
    args: UnvestedTokensRevokedEvent;
    name: 'UnvestedTokensRevokedEvent';
  };
}

export type LockedNORIEvents = ContractEvents<LockedNORIEventMap>;
