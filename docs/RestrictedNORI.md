## RestrictedNORI


Based on the mechanics of a wrapped ERC-20 token, this contract layers schedules over the withdrawal
functionality to implement _restriction_, a time-based release of tokens that, until released, can be reclaimed
by Nori to enforce the permanence guarantee of carbon removals.

##### Behaviors and features:

###### Schedules

- _Schedules_ define the release timeline for restricted tokens.
- A specific schedule is associated with one ERC1155 token ID and can have multiple token holders.

###### Restricting

- _Restricting_ is the process of gradually releasing tokens that may need to be recaptured by Nori in the event
that the sequestered carbon for which the tokens were exchanged is found to violate its permanence guarantee.
In this case, tokens need to be recaptured to mitigate the loss and make the original buyer whole by using them to
purchase new NRTs on their behalf.
- Tokens are released linearly from the schedule's start time until its end time. As NRTs are sold, proceeds may
be routed to a restriction schedule at any point in the schedule's timeline, thus increasing the total balance of
the schedule as well as the released amount at the current timestamp (assuming it's after the schedule start time).

###### Transferring

- A given schedule is a logical overlay to a specific 1155 token. This token can have any number of token holders,
and transferability via `safeTransferFrom` and `safeBatchTransferFrom` is enabled.
Ownership percentages only become relevant and are enforced during withdrawal and revocation.

###### Withdrawal

- _Withdrawal_ is the process of a token holder claiming the tokens that have been released by the restriction
schedule. When tokens are withdrawn, the 1155 schedule token is burned, and the BridgedPolygonNORI being held
by this contract is sent to the address specified by the token holder performing the withdrawal.
Tokens are released by a schedule based on the linear release of the schedule's `totalSupply`, but a token holder
can only withdraw released tokens in proportion to their percentage ownership of the schedule tokens.

###### Revocation

- _Revocation_ is the process of tokens being recaptured by Nori to enforce carbon permanence guarantees.
Only unreleased tokens can ever be revoked. When tokens are revoked from a schedule, the current number of released
tokens does not decrease, even as the schedule's total supply decreases through revocation (a floor is enforced).
When these tokens are revoked, the 1155 schedule token is burned, and the BridgedPolygonNORI held by this contract
is sent to the address specified by Nori. If a schedule has multiple token holders, tokens are burned from each
holder in proportion to their total percentage ownership of the schedule.

###### Additional behaviors and features

- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
pausable.
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
- `SCHEDULE_CREATOR_ROLE`: Can create restriction schedules without sending BridgedPolygonNORI to the contract. The
market contract has this role and sets up relevant schedules as removal tokens are listed for sale.
- `MINTER_ROLE`: Can call `mint` on this contract, which mints tokens of the correct schedule ID (token ID) for a
given removal. The market contract has this role and can mint RestrictedNORI while routing sale proceeds to this
contract.
- `TOKEN_REVOKER_ROLE`: Can revoke unreleased tokens from a schedule. Only Nori admin wallet should have this role.
- `PAUSER_ROLE`: Can pause and unpause the contract.
- `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.

##### Inherits:

- [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)

##### Implements:

- [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)

##### Uses:

- [RestrictedNORILib](./RestrictedNORILib.md) for `Schedule`.
- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet) for
`EnumerableSetUpgradeable.UintSet` and `EnumerableSetUpgradeable.AddressSet`.
- [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)




---

### SCHEDULE_CREATOR_ROLE

```solidity
bytes32 SCHEDULE_CREATOR_ROLE
```

Role conferring creation of schedules.

<i>The Market contract is granted this role after deployments.</i>



### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

Role conferring sending of bridgedPolygonNORI to this contract.

<i>The Market contract is granted this role after deployments.</i>



### TOKEN_REVOKER_ROLE

```solidity
bytes32 TOKEN_REVOKER_ROLE
```

Role conferring revocation of restricted tokens.

<i>Only Nori admin addresses should have this role.</i>



### _methodologyAndVersionToScheduleDuration

```solidity
mapping(uint256 => mapping(uint256 => uint256)) _methodologyAndVersionToScheduleDuration
```





### _scheduleIdToScheduleStruct

```solidity
mapping(uint256 => struct Schedule) _scheduleIdToScheduleStruct
```





### _allScheduleIds

```solidity
struct EnumerableSetUpgradeable.UintSet _allScheduleIds
```





### _bridgedPolygonNORI

```solidity
contract BridgedPolygonNORI _bridgedPolygonNORI
```

The BridgedPolygonNORI contract for which this contract wraps tokens.




### _removal

```solidity
contract Removal _removal
```

The Removal contract that accounts for carbon removal supply.




### ScheduleCreated

```solidity
event ScheduleCreated(uint256 projectId, uint256 startTime, uint256 endTime)
```

Emitted on successful creation of a new schedule.




### TokensRevoked

```solidity
event TokensRevoked(uint256 atTime, uint256 scheduleId, uint256 quantity, address[] scheduleOwners, uint256[] quantitiesBurned)
```

Emitted when unreleased tokens of an active schedule are revoked.




### TokensClaimed

```solidity
event TokensClaimed(address from, address to, uint256 scheduleId, uint256 quantity)
```

Emitted on withdrawal of released tokens.




### constructor

```solidity
constructor() public
```

Locks the contract, preventing any future re-initialization.

<i>See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).</i>



### initialize

```solidity
function initialize() external
```





### revokeUnreleasedTokens

```solidity
function revokeUnreleasedTokens(uint256 projectId, uint256 amount, address toAccount) external
```

Revokes amount of tokens from the specified project (schedule) ID and transfers to `toAccount`.

<i>The behavior of this function can be used in two specific ways:
1. To revoke a specific number of tokens as specified by the `amount` parameter.
2. To revoke all remaining revokable tokens in a schedule by specifying 0 as the `amount`.

Transfers any unreleased tokens in the specified schedule and reduces the total supply
of that token. Only unreleased tokens can be revoked from a schedule and no change is made to
balances that have released but not yet been claimed.
If a token has multiple owners, balances are burned proportionally to ownership percentage,
summing to the total amount being revoked.
Once the tokens have been revoked, the current released amount can never fall below
its current level, even if the linear release schedule of the new amount would cause
the released amount to be lowered at the current timestamp (a floor is established).

Unlike in the `withdrawFromSchedule` function, here we burn `RestrictedNORI`
from the schedule owner but send that `BridgedPolygonNORI` back to Nori's
treasury or an address of Nori's choosing (the `toAccount` address).
The `claimedAmount` is not changed because this is not a claim operation.

Emits a `TokensRevoked` event.

##### Requirements:

- Can only be used when the caller has the `TOKEN_REVOKER_ROLE`.
- The requirements of `_beforeTokenTransfer` apply to this function.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | The schedule ID from which to revoke tokens. |
| amount | uint256 | The amount to revoke. |
| toAccount | address | The account to which the underlying BridgedPolygonNORI should be sent. |


### registerContractAddresses

```solidity
function registerContractAddresses(contract BridgedPolygonNORI bridgedPolygonNORI, contract Removal removal) external
```

Registers the addresses of the Market, BridgedPolygonNORI, and Removal contracts in this contract.

##### Requirements:

- Can only be used when the contract is not paused.
- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| bridgedPolygonNORI | contract BridgedPolygonNORI | The address of the BridgedPolygonNORI contract for which this contract wraps tokens. |
| removal | contract Removal | The address of the Removal contract that accounts for Nori's issued carbon removals. |


### createSchedule

```solidity
function createSchedule(uint256 projectId, uint256 startTime, uint8 methodology, uint8 methodologyVersion) external
```

Sets up a restriction schedule with parameters determined from the project ID.

##### Requirements:
- Can only be used when the contract is not paused.
- Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role.


| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | The ID that will be used as this schedule's token ID |
| startTime | uint256 | The schedule's start time in seconds since the unix epoch |
| methodology | uint8 | The methodology of this project, used to look up correct schedule duration |
| methodologyVersion | uint8 | The methodology version, used to look up correct schedule duration |


### mint

```solidity
function mint(uint256 amount, uint256 removalId) external
```

Mints `amount` of RestrictedNORI to the schedule (token ID) that corresponds to the provided `removalId`.
The schedule ID for this removal is looked up in the Removal contract.
The underlying BridgedPolygonNORI asset is sent to this contract from the buyer by the Market contract
during a purchase, so this function only concerns itself with minting the RestrictedNORI token for the
correct token ID.

##### Requirements:

- Can only be used if the caller has the `MINTER_ROLE`.
- The rules of `_beforeTokenTransfer` apply.


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of RestrictedNORI to mint. |
| removalId | uint256 | The removal token ID for which proceeds are being restricted. |


### withdrawFromSchedule

```solidity
function withdrawFromSchedule(address recipient, uint256 scheduleId, uint256 amount) external returns (bool)
```

Claim sender's released tokens and withdraw them to `recipient` address.

<i>This function burns `amount` of `RestrictedNORI` for the given schedule ID
and transfers `amount` of `BridgedPolygonNORI` from the `RestrictedNORI` contract's
balance to `recipient`'s balance.
Enforcement of the availability of claimable tokens for the `_burn` call happens in `_beforeTokenTransfer`.

Emits a `TokensClaimed` event.

##### Requirements:

- Can only be used when the contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving the underlying BridgedPolygonNORI. |
| scheduleId | uint256 | The schedule from which to withdraw. |
| amount | uint256 | The amount to withdraw. |


### getAllScheduleIds

```solidity
function getAllScheduleIds() external view returns (uint256[])
```

Returns an array of all existing schedule IDs, regardless of the status of the schedule.




### getScheduleDetailForAccount

```solidity
function getScheduleDetailForAccount(address account, uint256 scheduleId) external view returns (struct ScheduleDetailForAddress)
```

Returns an account-specific view of the details of a specific schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account for which to provide schedule details. |
| scheduleId | uint256 | The token ID of the schedule for which to retrieve details. |


### batchGetScheduleDetailsForAccount

```solidity
function batchGetScheduleDetailsForAccount(address account, uint256[] scheduleIds) external view returns (struct ScheduleDetailForAddress[])
```

Batch version of `getScheduleDetailForAccount`.




### scheduleExists

```solidity
function scheduleExists(uint256 scheduleId) external view returns (bool)
```

Returns the existence of a schedule.




### batchGetScheduleSummaries

```solidity
function batchGetScheduleSummaries(uint256[] scheduleIds) external view returns (struct ScheduleSummary[])
```

Returns an array of summary structs for the specified schedules.




### claimableBalanceForSchedule

```solidity
function claimableBalanceForSchedule(uint256 scheduleId) external view returns (uint256)
```

Released balance less the total claimed amount at current block timestamp for a schedule.




### claimableBalanceForScheduleForAccount

```solidity
function claimableBalanceForScheduleForAccount(uint256 scheduleId, address account) external view returns (uint256)
```

A single account's claimable balance at current block timestamp for a schedule.

<i>Calculations have to consider an account's total proportional claim to the schedule's released tokens,
using totals constructed from current balances and claimed amounts, and then subtract anything that
account has already claimed.</i>



### revocableQuantityForSchedule

```solidity
function revocableQuantityForSchedule(uint256 scheduleId) external view returns (uint256)
```

Returns the current number of revocable tokens for a given schedule at the current block timestamp.




### setRestrictionDurationForMethodologyAndVersion

```solidity
function setRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion, uint256 durationInSeconds) public
```

Sets the duration in seconds that should be applied to schedules created on behalf of removals
originating from the given methodology and methodology version.

##### Requirements:

- Can only be used when the contract is not paused.
- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| methodology | uint256 | The methodology of carbon removal |
| methodologyVersion | uint256 | The version of the methodology |
| durationInSeconds | uint256 | The duration in seconds that insurance funds should be restricted for this methodology and version |


### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) public
```

Transfers `amount` tokens of token type `id` from `from` to `to`.

<i>[See the OZ ERC1155 documentation for more] (
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
#ERC1155-safeTransferFrom-address-address-uint256-uint256-bytes-)</i>



### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) public
```

Batched version of `safeTransferFrom`.

<i>[See the OZ ERC1155 documentation for more] (
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
#IERC1155-safeBatchTransferFrom-address-address-uint256---uint256---bytes-)</i>



### getScheduleSummary

```solidity
function getScheduleSummary(uint256 scheduleId) public view returns (struct ScheduleSummary)
```

Returns summary struct for a schedule.




### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```


<i>See [IERC165.supportsInterface](
https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.</i>



### getRestrictionDurationForMethodologyAndVersion

```solidity
function getRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion) public view returns (uint256)
```

Returns the schedule duration in seconds that has been set for a given methodology and methodology version.


| Name | Type | Description |
| ---- | ---- | ----------- |
| methodology | uint256 | The methodology of carbon removal. |
| methodologyVersion | uint256 | The version of the methodology. |


### _createSchedule

```solidity
function _createSchedule(uint256 projectId, uint256 startTime, uint256 restrictionDuration) internal
```

Sets up a schedule for the specified project.

<i>Schedules are created when removal tokens are listed for sale in the market contract,
so this should only be invoked during `tokensReceived` in the exceptional case that
tokens were sent to this contract without a schedule set up.

Revert strings are used instead of custom errors here for proper surfacing
from within the market contract `onERC1155BatchReceived` hook.

Emits a `ScheduleCreated` event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | The ID that will be used as the new schedule's ID |
| startTime | uint256 | The schedule start time in seconds since the unix epoch |
| restrictionDuration | uint256 | The duration of the schedule in seconds since the unix epoch |


### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called before any token transfer. This includes minting and burning, as well as batched
variants.

<i>Follows the rules of hooks defined [here](
https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

See the ERC1155 specific version [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155
#ERC1155-_beforeTokenTransfer-address-address-address-uint256---uint256---bytes-).

##### Requirements:

- The contract must not be paused.
- One of the following must be true:
   - The operation is a mint (which should ONLY occur when BridgedPolygonNORI is being wrapped via `_depositFor`).
   - The operation is a burn, which only happens during revocation and withdrawal:
     - If the operation is a revocation, that permission is enforced by the `TOKEN_REVOKER_ROLE`.
     - If the operation is a withdrawal the burn amount must be <= the sender's claimable balance.
   - The operation is a transfer and _all_ the following must be true:
     - The operator is operating on their own balance (enforced in the inherited contract).
     - The operator has sufficient balance to transfer (enforced in the inherited contract).</i>



### _validateSchedule

```solidity
function _validateSchedule(uint256 startTime, uint256 restrictionDuration) internal pure
```

Validates that the schedule start time and duration are non-zero.




### _quantityToRevokeForTokenHolder

```solidity
function _quantityToRevokeForTokenHolder(uint256 totalQuantityToRevoke, uint256 scheduleId, struct Schedule schedule, address account, uint256 balanceOfAccount) private view returns (uint256)
```

Calculates the quantity that should be revoked from a given token holder and schedule based on their
proportion of ownership of the schedule's tokens and the total number of tokens being revoked.


| Name | Type | Description |
| ---- | ---- | ----------- |
| totalQuantityToRevoke | uint256 | The total quantity of tokens being revoked from this schedule. |
| scheduleId | uint256 | The schedule (token ID) from which tokens are being revoked. |
| schedule | struct Schedule | The schedule (struct) from which tokens are being revoked. |
| account | address | The token holder for which to calculate the quantity that should be revoked. |
| balanceOfAccount | uint256 | The total balance of this token ID owned by `account`. |




