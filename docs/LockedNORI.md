## LockedNORI


Based on the mechanics of a wrapped ERC-20 token, this contract layers schedules over the withdrawal  functionality to implement _vesting_ (a revocable grant) and _lockup_ (an irrevocable time-lock on utility).  
##### Additional behaviors and features:
 
###### Grants  
- _Grants_ define lockup periods and vesting schedules for tokens.  
- A single grant per address is supported.  
###### Vesting  
- _Vesting_ is applied in scenarios where the tokens may need to be recaptured by Nori. This could either be due to  an employee leaving the company before being fully vested or because one of our suppliers incurs a carbon loss so  their restricted (unvested in the terminology of this contract). Tokens need to be recaptured to mitigate the loss  and make the original buyer whole by using them to purchases new NRTs on their behalf.  
- Tokens are released linearly from the latest cliff date to the end date of the grant based on the `block.timestamp`  of each block.  
###### Lockup  
- _Lockup_ refers to tokens that are guaranteed to be available to the grantee but are subject to a time delay before  they are usable / transferrable out of this smart contract. This is a standard mechanism used to avoid sudden floods  of liquidity in the BridgedPolygonNORI token that could severely depress the price.  
- Unlock is always at the same time or lagging vesting  
- Transfer of LockedNORI under lockup is forbidden  
###### Cliffs  
- A _cliff_ refers to a period prior to which no tokens are vested or unlocked. Cliffs are defined by a date and an  amount which must be <= the overall grant amount.  
- This contract supports a maximum of two distinct cliffs per grant. The effect of fewer cliffs can be achieved by  setting one of both cliff times to the start time or end time, and/or by setting the cliff amount to zero.  
###### Additional behaviors and features:  
- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)  
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)  
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are  pausable  
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)  
- `TOKEN_GRANTER_ROLE`: Can create token grants without sending `BridgedPolygonNORI` to the contract `createGrant`  
- `PAUSER_ROLE`: Can pause and unpause the contract  
- `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles  
- [Can receive `BridgedPolygonNORI` ERC-777 tokens](https://eips.ethereum.org/EIPS/eip-777#hooks):  `BridgedPolygonNORI` is wrapped and grants are created upon receipt  
- [Limited ERC-777 functionality](https://eips.ethereum.org/EIPS/eip-777): The `burn` and `operatorBurn` will revert  as only the internal variants are expected to be used. Additionally, `mint` is not callable as only the internal  variants are expected to be used when wrapping `BridgedPolygonNORI`  
- [Limited ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/erc20): `mint` is not callable as only  the internal variants are expected to be used when wrapping `BridgedPolygonNORI`. Additionally, `burn` functions are  not externally callable  
- [Extended Wrapped ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Wrapper):  In absence of a grant `LockedNORI functions` identically to a standard wrapped token. Additionally, when a grant is  defined, `LockedNORI` follows the restrictions noted above.  
##### Inherits:
 
- [ERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#ERC777)  
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)  
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)  
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)  
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)  
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)  
##### Implements:
 
- [IERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777)  
- [IERC20Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20)  
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)  
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)  
##### Uses:
 
- [LockedNORILib](./LockedNORILib.md) for `Schedule`  
- [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)




---

### TokenGrant






```solidity
struct TokenGrant {
  struct Schedule vestingSchedule;
  struct Schedule lockupSchedule;
  uint256 grantAmount;
  uint256 claimedAmount;
  uint256 originalAmount;
  bool exists;
  uint256 lastRevocationTime;
  uint256 lastQuantityRevoked;
}
```

### TokenGrantDetail






```solidity
struct TokenGrantDetail {
  uint256 grantAmount;
  address recipient;
  uint256 startTime;
  uint256 vestEndTime;
  uint256 unlockEndTime;
  uint256 cliff1Time;
  uint256 cliff2Time;
  uint256 vestCliff1Amount;
  uint256 vestCliff2Amount;
  uint256 unlockCliff1Amount;
  uint256 unlockCliff2Amount;
  uint256 claimedAmount;
  uint256 originalAmount;
  uint256 lastRevocationTime;
  uint256 lastQuantityRevoked;
  bool exists;
}
```

### CreateTokenGrantParams






```solidity
struct CreateTokenGrantParams {
  address recipient;
  uint256 startTime;
  uint256 vestEndTime;
  uint256 unlockEndTime;
  uint256 cliff1Time;
  uint256 cliff2Time;
  uint256 vestCliff1Amount;
  uint256 vestCliff2Amount;
  uint256 unlockCliff1Amount;
  uint256 unlockCliff2Amount;
}
```

### DepositForParams






```solidity
struct DepositForParams {
  address recipient;
  uint256 startTime;
}
```

### TOKEN_GRANTER_ROLE

```solidity
bytes32 TOKEN_GRANTER_ROLE
```

Role conferring creation and revocation of token grants.




### ERC777_TOKENS_RECIPIENT_HASH

```solidity
bytes32 ERC777_TOKENS_RECIPIENT_HASH
```

Used to register the ERC777TokensRecipient recipient interface in the  ERC-1820 registry.  No longer used, retained to maintain storage layout.




### _grants

```solidity
mapping(address => struct LockedNORI.TokenGrant) _grants
```

A mapping from grantee to grant




### _bridgedPolygonNori

```solidity
contract BridgedPolygonNORI _bridgedPolygonNori
```

The BridgedPolygonNORI contract that this contract wraps tokens for




### _erc1820

```solidity
contract IERC1820RegistryUpgradeable _erc1820
```

The [ERC-1820](https://eips.ethereum.org/EIPS/eip-1820) pseudo-introspection registry  contract




### TokenGrantCreatedBatch

```solidity
event TokenGrantCreatedBatch(uint256 totalAmount)
```

Emitted on successful batch creation of new grants.




### TokenGrantCreated

```solidity
event TokenGrantCreated(address recipient, uint256 amount, uint256 startTime, uint256 vestEndTime, uint256 unlockEndTime)
```

Emitted on successful creation of a new grant.




### UnvestedTokensRevoked

```solidity
event UnvestedTokensRevoked(uint256 atTime, address from, uint256 quantity)
```

Emitted on when the vesting portion of an active grant is terminated.




### TokensClaimed

```solidity
event TokensClaimed(address from, address to, uint256 quantity)
```

Emitted on withdrawl of fully unlocked tokens.




### UnderlyingTokenAddressUpdated

```solidity
event UnderlyingTokenAddressUpdated(address from, address to)
```

Emitted when the underlying token contract address is updated due to migration.




### constructor

```solidity
constructor() public
```


<i>Ensure implementation contract is minimally initialized. See more [here](  https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract).</i>



### depositFor

```solidity
function depositFor(address recipient, uint256 amount) external returns (bool)
```

Mints wrapper token to `recipient` if a grant exists.

<i>If `startTime` is zero no grant is set up. Satisfies situations where funding of the grant happens over time.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address |  |
| amount | uint256 | The quantity of `_bridgedPolygonNori` to deposit. |


### withdrawTo

```solidity
function withdrawTo(address recipient, uint256 amount) external returns (bool)
```

Claim unlocked tokens and withdraw them to the `to` address.

<i>This function burns `amount` of `LockedNORI` and transfers `amount`  of `BridgedPolygonNORI` from the `LockedNORI` contract's balance to  `_msgSender()`'s balance.  Enforcement of the availability of wrapped and unlocked tokens  for the `_burn` call happens in `_beforeTokenTransfer`  
##### Requirements:
 
- Can only be used when the contract is not paused.</i>



### batchCreateGrants

```solidity
function batchCreateGrants(uint256[] amounts, bytes[] grantParams, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
```

Batch version of `createGrant` with permit support.




### createGrant

```solidity
function createGrant(uint256 amount, address recipient, uint256 startTime, uint256 vestEndTime, uint256 unlockEndTime, uint256 cliff1Time, uint256 cliff2Time, uint256 vestCliff1Amount, uint256 vestCliff2Amount, uint256 unlockCliff1Amount, uint256 unlockCliff2Amount) external
```

Sets up a vesting + lockup schedule for recipient.

<i>This function can be used as an alternative way to set up a grant that doesn't require  wrapping BridgedPolygonNORI first.  
##### Requirements:
 
- Can only be used when the contract is not paused.  
- Can only be used when the caller has the `TOKEN_GRANTER_ROLE` role.</i>



### batchRevokeUnvestedTokenAmounts

```solidity
function batchRevokeUnvestedTokenAmounts(address[] fromAccounts, address[] toAccounts, uint256[] atTimes, uint256[] amounts) external
```

Truncates a batch of vesting grants of amounts in a single go

<i>Transfers any unvested tokens in `fromAccounts`'s grant to `to` and reduces the total grant size. No change  is made to balances that have vested but not yet been claimed whether locked or not.  The behavior of this function can be used in two specific ways:  
- To revoke all remaining revokable tokens in a batch (regardless of time), set amount to 0 in the `amounts` array.  
- To revoke tokens at the current block timestamp, set `atTimes` to 0 in the `amounts` array.  
##### Requirements:
 
- Can only be used when the caller has the `TOKEN_GRANTER_ROLE` role.  
- The requirements of `_beforeTokenTransfer` apply to this function.  
- `fromAccounts.length == toAccounts.length == atTimes.length == amounts.length`.</i>



### quantityRevokedFrom

```solidity
function quantityRevokedFrom(address account) external view returns (uint256)
```

Number of unvested tokens that were revoked if any.




### vestedBalanceOf

```solidity
function vestedBalanceOf(address account) external view returns (uint256)
```

Vested balance less any claimed amount at current block timestamp.




### batchGetGrant

```solidity
function batchGetGrant(address[] accounts) public view returns (struct LockedNORI.TokenGrantDetail[])
```

Returns all governing settings for multiple grants

<i>If a grant does not exist for an account, the resulting grant will be zeroed out in the return value</i>



### getGrant

```solidity
function getGrant(address account) public view returns (struct LockedNORI.TokenGrantDetail)
```

Returns all governing settings for a grant.




### initialize

```solidity
function initialize(contract BridgedPolygonNORI bridgedPolygonNoriAddress) public
```





### updateUnderlying

```solidity
function updateUnderlying(contract BridgedPolygonNORI newUnderlying) external
```

Admin function to update the underlying token contract address.

<i>Used in case of major migrations only.</i>



### burn

```solidity
function burn(uint256, bytes) public pure
```

Overridden standard ERC777.burn that will always revert

<i>This function is not currently supported from external callers, so we override it so that we can revert.</i>



### operatorBurn

```solidity
function operatorBurn(address, uint256, bytes, bytes) public pure
```

Overridden standard ERC777.operatorBurn that will always revert

<i>This function is not currently supported from external callers so we override it so that we can revert.</i>



### unlockedBalanceOf

```solidity
function unlockedBalanceOf(address account) public view returns (uint256)
```

Unlocked balance less any claimed amount at current block timestamp.




### _createGrant

```solidity
function _createGrant(uint256 amount, bytes userData) internal returns (address recipient)
```

Sets up a vesting + lockup schedule for recipient (implementation).

<i>All grants must include a lockup schedule and can optionally *also*  include a vesting schedule.  Tokens are withdrawable once they are  vested *and* unlocked.  It is also callable externally (see `grantTo`) to handle cases  where tokens are incrementally deposited after the grant is established.</i>



### _revokeUnvestedTokens

```solidity
function _revokeUnvestedTokens(address from, address to, uint256 atTime, uint256 amount) internal
```

Truncates a vesting grant.  This is an *admin* operation callable only by addresses having `TOKEN_GRANTER_ROLE`  (enforced in `batchRevokeUnvestedTokenAmounts`)

<i>The implementation never updates underlying schedules (vesting or unlock)  but only the grant amount.  This avoids changing the behavior of the grant  before the point of revocation.  Anytime a vesting or unlock schedule is in  play the corresponding balance functions need to take care to never return  more than the grant amount less the claimed amount.  Unlike in the `claim` function, here we burn `LockedNORI` from the grant holder but  send that `BridgedPolygonNORI` back to Nori's treasury or an address of Nori's  choosing (the `to` address).  The `claimedAmount` is not changed because this is  not a claim operation.</i>



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal
```

Hook that is called before send, transfer, mint, and burn. Used to disable transferring lNORI.

<i>Follows the rules of hooks defined [here](   https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)  
##### Requirements:
 
- The contract must not be paused.  
- The recipient cannot be the zero address (e.g., no burning of tokens is allowed).  
- One of the following must be true:     
- The operation is minting (which should ONLY occur when BridgedPolygonNORI is being wrapped via `_depositFor`)     
- The operation is a burn and _all_ the following must be true:       
- The operator has `TOKEN_GRANTER_ROLE`.       
- The operator is not operating on their own balance.       
- The transfer amount is <= the sender's unlocked balance.</i>



### _hasVestingSchedule

```solidity
function _hasVestingSchedule(address account) private view returns (bool)
```

Vested balance less any claimed amount at `atTime` (implementation)

<i>Returns true if the there is a grant for *account* with a vesting schedule.</i>



### _vestedBalanceOf

```solidity
function _vestedBalanceOf(address account, uint256 atTime) internal view returns (uint256)
```

Vested balance less any claimed amount at `atTime` (implementation)

<i>If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total  grant amount. This is done to preserve the behavior of the vesting schedule despite a reduction in the total  quantity of tokens vesting.  i.o.w The rate of vesting does not change after calling `revokeUnvestedTokens`.</i>



### _unlockedBalanceOf

```solidity
function _unlockedBalanceOf(address account, uint256 atTime) internal view returns (uint256)
```

Unlocked balance less any claimed amount

<i>If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total  grant amount. This is done to preserve the behavior of the unlock schedule despite a reduction in the total  quantity of tokens vesting.  i.o.w The rate of unlocking does not change after calling `revokeUnvestedTokens`.</i>



### _beforeOperatorChange

```solidity
function _beforeOperatorChange(address operator, uint256 value) internal pure
```





### send

```solidity
function send(address, uint256, bytes) public pure
```





### operatorSend

```solidity
function operatorSend(address, address, uint256, bytes, bytes) public pure
```





### transfer

```solidity
function transfer(address, uint256) public pure returns (bool)
```





### transferFrom

```solidity
function transferFrom(address, address, uint256) public pure returns (bool)
```





### _beforeRoleChange

```solidity
function _beforeRoleChange(bytes32 role, address account) internal virtual
```







