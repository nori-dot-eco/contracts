## LockedNORI


Based on the mechanics of a wrapped ERC-777 token, this contract layers schedules over the withdrawal
functionality to implement _vesting_ (a revocable grant)
and _lockup_ (an irrevocable timelock on utility).
##### Behaviors and features
###### Grants
- _Grants_ define lockup periods and vesting schedules for tokens
- A single grant per address is supported
###### Vesting
- _Vesting_ is applied in scenarios where the tokens may need to be recaptured by Nori. This could either be due to
an employee leaving the company before being fully vested or because one of our suppliers incurs a carbon loss so
their restricted (unvested in the terminology of this contract). tokens need to be recaptured to mitigate the loss
and make the original buyer whole by using them to purchases new NRTs on their behalf.
- Tokens are released linearly from the latest cliff date to the end date of the grant based on the block.timestamp
of each block
###### Lockup
- _Lockup_ refers to tokens that are guaranteed to be available to the grantee but are subject to a time delay before
they are usable / transferrable out of this smart contract. This is a standard mechanism used to avoid sudden floods
of liquidity in the BridgedPolygonNORI token that could severely depress the price.
- Unlock is always at the same time or lagging vesting
- Transfer of LockedNORI under lockup is forbidden
###### Cliffs
- A _cliff_ refers to a period prior to which no tokens are vested or unlocked. Cliffs are defined by a date and an
amount which must be &lt;&#x3D; the overall grant amount.
- This contract supports a maximum of two distinct cliffs per grant. The effect of fewer cliffs can be achieve by
setting one of both cliff times to the start time or end time, and/or by setting the cliff amount to zero.
###### Additional behaviors and features
- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
  - all functions that mutate state are pausable
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
   - TOKEN_GRANTER_ROLE
     - Can create token grants without sending BridgedPolygonNORI to the contract &#x60;createGrant&#x60;
   - PAUSER_ROLE
     - Can pause and unpause the contract
   - DEFAULT_ADMIN_ROLE
     - This is the only role that can add/revoke other accounts to any of the roles
- [Can receive BridgedPolygonNORI ERC-777 tokens](https://eips.ethereum.org/EIPS/eip-777#hooks)
  - BridgedPolygonNORI is wrapped and grants are created upon receipt
- [Limited ERC-777 functionality](https://eips.ethereum.org/EIPS/eip-777)
  - burn and operatorBurn will revert as only the internal variants are expected to be used
  - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
- [Limited ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/erc20)
  - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
  - burn functions are not externally callable
- [Extended Wrapped ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Wrapper)
  - In absence of a grant LockedNORI functions identically to a standard wrapped token
  - when a grant is defined, LockedNORI follows the restrictions noted above
##### Inherits
- [ERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#ERC777)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
##### Implements
- [IERC777RecipientUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777Recipient)
- [IERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777)
- [IERC20Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
##### Uses
- [ScheduleUtils](./ScheduleUtils.md) for Schedule
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

Used to register the ERC777TokensRecipient recipient interface in the
ERC-1820 registry

_Registering that LockedNORI implements the ERC777TokensRecipient interface with the registry is a
requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction_



### _grants

```solidity
mapping(address &#x3D;&gt; struct LockedNORI.TokenGrant) _grants
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

The [ERC-1820](https://eips.ethereum.org/EIPS/eip-1820) pseudo-introspection registry
contract

_Registering that LockedNORI implements the ERC777TokensRecipient interface with the registry is a
requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction_



### TokenGrantCreated

```solidity
event TokenGrantCreated(address recipient, uint256 amount, uint256 startTime, uint256 vestEndTime, uint256 unlockEndTime)
```

Emitted on successful creation of a new grant.




### UnvestedTokensRevoked

```solidity
event UnvestedTokensRevoked(uint256 atTime, address from, uint256 quantity)
```



_Emitted on when the vesting portion of an active grant is terminated._



### TokensClaimed

```solidity
event TokensClaimed(address account, uint256 quantity)
```



_Emitted on withdwal of fully unlocked tokens._



### tokensReceived

```solidity
function tokensReceived(address, address, address, uint256 amount, bytes userData, bytes operatorData) external
```

This function is triggered when BridgedPolygonNORI is sent to this contract

_Sending BridgedPolygonNORI to this contract triggers the tokensReceived hook defined by the ERC-777 standard
because this contract is a registered ERC777 tokens recipient.
[See here for more](
https://github.com/ethereum/EIPs/blob/master/EIPS/eip-777.md#erc777tokensrecipient-and-the-tokensreceived-hook)_



### withdrawTo

```solidity
function withdrawTo(address account, uint256 amount) external returns (bool)
```

Unwrap BridgedPolygonNORI tokens and makes them available for use in the BridgedPolygonNORI contract

_This function burns &#x60;amount&#x60; of wrapped tokens and withdraws them to the corresponding {BridgedPolygonNORI}
tokens.
##### Requirements:
- Can only be used when the contract is not paused._



### createGrant

```solidity
function createGrant(uint256 amount, address recipient, uint256 startTime, uint256 vestEndTime, uint256 unlockEndTime, uint256 cliff1Time, uint256 cliff2Time, uint256 vestCliff1Amount, uint256 vestCliff2Amount, uint256 unlockCliff1Amount, uint256 unlockCliff2Amount) external
```

Sets up a vesting + lockup schedule for recipient.

_This function can be used as an alternative way to set up a grant that doesn&#x27;t require
wrapping BridgedPolygonNORI first.
##### Requirements:
- Can only be used when the contract is not paused.
- Can only be used when the caller has the &#x60;TOKEN_GRANTER_ROLE&#x60; role_



### revokeUnvestedTokens

```solidity
function revokeUnvestedTokens(address from, address to, uint256 atTime) external
```



_revokeUnvestedTokens: Truncates a vesting grant.
Transfers any unvested tokens in &#x60;from&#x60;&#x27;s grant to &#x60;to&#x60;
and reduces the total grant size.
No change is made to balances that have vested but not yet been claimed
whether locked or not._



### revokeUnvestedTokenAmount

```solidity
function revokeUnvestedTokenAmount(address from, address to, uint256 atTime, uint256 amount) external
```



_revokeUnvestedTokenAmount: Truncates a vesting grant.
Transfers any unvested tokens in &#x60;from&#x60;&#x27;s grant to &#x60;to&#x60;
and reduces the total grant size.
No change is made to balances that have vested but not yet been claimed
whether locked or not._



### quantityRevokedFrom

```solidity
function quantityRevokedFrom(address account) external view returns (uint256)
```



_Number of unvested tokens that were revoked if any._



### vestedBalanceOf

```solidity
function vestedBalanceOf(address account) external view returns (uint256)
```



_Vested balance less any claimed amount at current block timestamp._



### getGrant

```solidity
function getGrant(address account) external view returns (struct LockedNORI.TokenGrantDetail)
```

Returns all governing settings for a grant.




### initialize

```solidity
function initialize(contract IERC777Upgradeable bridgedPolygonNoriAddress) public
```






### burn

```solidity
function burn(uint256, bytes) public pure
```

Overridden standard ERC777.burn that will always revert

_This function is not currently supported from external callers so we override it so that we can revert._



### operatorBurn

```solidity
function operatorBurn(address, uint256, bytes, bytes) public pure
```

Overridden standard ERC777.operatorBurn that will always revert

_This function is not currently supported from external callers so we override it so that we can revert._



### unlockedBalanceOf

```solidity
function unlockedBalanceOf(address account) public view returns (uint256)
```



_Unlocked balance less any claimed amount at current block timestamp._



### _depositFor

```solidity
function _depositFor(uint256 amount, bytes userData, bytes operatorData) internal returns (bool)
```



_Wraps minting of wrapper token and grant setup._

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | uint256 Quantity of &#x60;_bridgedPolygonNori&#x60; to deposit |
| userData | bytes | CreateTokenGrantParams or DepositForParams |
| operatorData | bytes | bytes extra information provided by the operator (if any) If &#x60;startTime&#x60; is zero no grant is set up. Satisfies situations where funding of the grant happens over time. |


### _createGrant

```solidity
function _createGrant(uint256 amount, bytes userData) internal
```



_Sets up a vesting + lockup schedule for recipient (implementation).
This will be invoked via the &#x60;tokensReceived&#x60; callback for cases
where we have the tokens in hand at the time we set up the grant.
It is also callable externally (see &#x60;grantTo&#x60;) to handle cases
where tokens are incrementally deposited after the grant is established._



### _revokeUnvestedTokens

```solidity
function _revokeUnvestedTokens(address from, address to, uint256 atTime, uint256 amount) internal
```



_Truncates a vesting grant_



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal
```

Hook that is called before send, transfer, mint, and burn. Used used to disable transferring locked nori.

_Follows the rules of hooks defined [here](
 https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
##### Requirements:
- the contract must not be paused
- the recipient cannot be the zero address (e.g., no burning of tokens is allowed)
- One of the following must be true:
   - the operation is minting (which should ONLY occur when BridgedPolygonNORI is being wrapped via &#x60;_depositFor&#x60;)
   - the operation is a burn and _all_ of the following must be true:
     - the operator has TOKEN_GRANTER_ROLE
     - the operator is not operating on their own balance
     - the transfer amount is &lt;&#x3D; the sender&#x27;s unlocked balance_



### _vestedBalanceOf

```solidity
function _vestedBalanceOf(address account, uint256 atTime) internal view returns (uint256)
```



_Vested balance less any claimed amount at &#x60;atTime&#x60; (implementation)_



### _unlockedBalanceOf

```solidity
function _unlockedBalanceOf(address account, uint256 atTime) internal view returns (uint256)
```

Unlocked balance less any claimed amount

_If any tokens have been revoked then the schedule (which doesn&#x27;t get updated) may return more than the total
grant amount. This is done to preserve the behavior of the unlock schedule despite a reduction in the total
quantity of tokens vesting.  i.o.w The rate of unlocking does not change after calling &#x60;revokeUnvestedTokens&#x60;_





