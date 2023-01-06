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

- A given schedule is a logical overlay to a specific 1155 token. This token can have any number of token holders
if restricted tokens for a given schedule are minted to multiple addresses, but RestrictedNORI cannot be transferred
between addresses. Ownership percentages are relevant and enforced during withdrawal and revocation.

###### Withdrawal

- _Withdrawal_ is the process of a token holder claiming the tokens that have been released by the restriction
schedule. When tokens are withdrawn, the 1155 schedule token is burned, and the underlying ERC20 token being held
by this contract is sent to the address specified by the token holder performing the withdrawal.
Tokens are released by a schedule based on the linear release of the schedule's `totalSupply`, but a token holder
can only withdraw released tokens in proportion to their percentage ownership of the schedule tokens.

###### Revocation

- _Revocation_ is the process of tokens being recaptured by Nori to enforce carbon permanence guarantees.
Only unreleased tokens can ever be revoked. When tokens are revoked from a schedule, the current number of released
tokens does not decrease, even as the schedule's total supply decreases through revocation (a floor is enforced).
When these tokens are revoked, the 1155 schedule token is burned, and the underlying ERC20 token held by this
contract is sent to the address specified by Nori. If a schedule has multiple token holders, tokens are burned from
each holder in proportion to their total percentage ownership of the schedule.

###### Additional behaviors and features

- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
pausable.
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
- `SCHEDULE_CREATOR_ROLE`: Can create restriction schedules without sending the underlying tokens to the contract.
The market contract has this role and sets up relevant schedules as removal tokens are minted.
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

Role conferring sending of underlying ERC20 token to this contract for wrapping.

<i>The Market contract is granted this role after deployments.</i>



### TOKEN_REVOKER_ROLE

```solidity
bytes32 TOKEN_REVOKER_ROLE
```

Role conferring revocation of restricted tokens.

<i>Only Nori admin addresses should have this role.</i>



### ScheduleCreated

```solidity
event ScheduleCreated(uint256 projectId, uint256 startTime, uint256 endTime)
```

Emitted on successful creation of a new schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | The ID of the project for which the schedule was created. |
| startTime | uint256 | The start time of the schedule. |
| endTime | uint256 | The end time of the schedule. |


### RevokeTokens

```solidity
event RevokeTokens(uint256 atTime, uint256 scheduleId, uint256 removalId, uint256 quantity, address[] scheduleOwners, uint256[] quantitiesBurned)
```

Emitted when unreleased tokens of an active schedule are revoked.


| Name | Type | Description |
| ---- | ---- | ----------- |
| atTime | uint256 | The time at which the revocation occurred. |
| scheduleId | uint256 | The ID of the schedule from which tokens were revoked. |
| removalId | uint256 | The ID of the released removal for which tokens were revoked. |
| quantity | uint256 | The quantity of tokens revoked. |
| scheduleOwners | address[] | The addresses of the schedule owners from which tokens were revoked. |
| quantitiesBurned | uint256[] | The quantities of tokens burned from each schedule owner. |


### ClaimTokens

```solidity
event ClaimTokens(address from, address to, uint256 scheduleId, uint256 quantity)
```

Emitted on withdrawal of released tokens.


| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address from which tokens were withdrawn. |
| to | address | The address to which tokens were withdrawn. |
| scheduleId | uint256 | The ID of the schedule from which tokens were withdrawn. |
| quantity | uint256 | The quantity of tokens withdrawn. |


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

Initialize the RestrictedNORI contract.




### revokeUnreleasedTokens

```solidity
function revokeUnreleasedTokens(uint256 removalId, uint256 amount, address toAccount) external
```

Revokes `amount` of tokens from the project (schedule) associated with the specificed
`removalId` and transfers them to `toAccount`.

<i>The behavior of this function can be used in two specific ways:
1. To revoke a specific number of tokens as specified by the `amount` parameter.
2. To revoke all remaining revokable tokens in a schedule by specifying 0 as the `amount`.

Transfers unreleased tokens in the removal's project's schedule and reduces the total supply
of that token. Only unreleased tokens can be revoked from a schedule and no change is made to
balances that have released but not yet been claimed.
If a token has multiple owners, balances are burned proportionally to ownership percentage,
summing to the total amount being revoked.
Once the tokens have been revoked, the current released amount can never fall below
its current level, even if the linear release schedule of the new amount would cause
the released amount to be lowered at the current timestamp (a floor is established).

Unlike in the `withdrawFromSchedule` function, here we burn RestrictedNORI
from the schedule owner but send that underlying ERC20 token back to Nori's
treasury or an address of Nori's choosing (the `toAccount` address).
The `claimedAmount` is not changed because this is not a claim operation.

Emits a `RevokeTokens` event.

##### Requirements:

- Can only be used when the caller has the `TOKEN_REVOKER_ROLE` role.
- The requirements of `_beforeTokenTransfer` apply to this function.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID that was released and on account of which tokens are being revoked. |
| amount | uint256 | The amount to revoke. |
| toAccount | address | The account to which the underlying ERC20 token should be sent. |


### registerContractAddresses

```solidity
function registerContractAddresses(contract IERC20WithPermit wrappedToken, contract IRemoval removal) external
```

Register the underlying assets used by this contract.

<i>Register the addresses of the Market, underlying ERC20, and Removal contracts in this contract.

##### Requirements:

- Can only be used when the contract is not paused.
- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| wrappedToken | contract IERC20WithPermit | The address of the underlying ERC20 contract for which this contract wraps tokens. |
| removal | contract IRemoval | The address of the Removal contract that accounts for Nori's issued carbon removals. |


### createSchedule

```solidity
function createSchedule(uint256 projectId, uint256 startTime, uint8 methodology, uint8 methodologyVersion) external
```

Sets up a restriction schedule with parameters determined from the project ID.

<i>Create a schedule for a project ID and set the parameters of the schedule.

##### Requirements:

- Can only be used when the contract is not paused.
- Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role.</i>

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

Mint RestrictedNORI tokens for a schedule.

<i>Mint `amount` of RestrictedNORI to the schedule ID that corresponds to the provided `removalId`.
The schedule ID for this removal is looked up in the Removal contract. The underlying ERC20 asset is
 sent to this contract from the buyer by the Market contract during a purchase, so this function only concerns
itself with minting the RestrictedNORI token for the correct token ID.

##### Requirements:

- Can only be used if the caller has the `MINTER_ROLE` role.
- The rules of `_beforeTokenTransfer` apply.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of RestrictedNORI to mint. |
| removalId | uint256 | The removal token ID for which proceeds are being restricted. |


### withdrawFromSchedule

```solidity
function withdrawFromSchedule(address recipient, uint256 scheduleId, uint256 amount) external returns (bool)
```

Claim sender's released tokens and withdraw them to `recipient` address.

<i>This function burns `amount` of RestrictedNORI for the given schedule ID
and transfers `amount` of underlying ERC20 token from the RestrictedNORI contract's
balance to `recipient`'s balance.
Enforcement of the availability of claimable tokens for the `_burn` call happens in `_beforeTokenTransfer`.

Emits a `ClaimTokens` event.

##### Requirements:

- Can only be used when the contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving the unwrapped underlying ERC20 token. |
| scheduleId | uint256 | The schedule from which to withdraw. |
| amount | uint256 | The amount to withdraw. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether or not the tokens were successfully withdrawn. |

### getAllScheduleIds

```solidity
function getAllScheduleIds() external view returns (uint256[])
```

Get all schedule IDs.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | Returns an array of all existing schedule IDs, regardless of the status of the schedule. |

### getScheduleDetailForAccount

```solidity
function getScheduleDetailForAccount(address account, uint256 scheduleId) external view returns (struct ScheduleDetailForAddress)
```

Returns an account-specific view of the details of a specific schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account for which to provide schedule details. |
| scheduleId | uint256 | The token ID of the schedule for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ScheduleDetailForAddress | Returns a &#x60;ScheduleDetails&#x60; struct containing the details of the schedule. |

### batchGetScheduleDetailsForAccount

```solidity
function batchGetScheduleDetailsForAccount(address account, uint256[] scheduleIds) external view returns (struct ScheduleDetailForAddress[])
```

Batch version of `getScheduleDetailForAccount`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account for which to provide schedule details. |
| scheduleIds | uint256[] | The token IDs of the schedules for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ScheduleDetailForAddress[] | Returns an array of &#x60;ScheduleDetails&#x60; structs containing the details of the schedules |

### scheduleExists

```solidity
function scheduleExists(uint256 scheduleId) external view returns (bool)
```

Check the existence of a schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The token ID of the schedule for which to check existence. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns a boolean indicating whether or not the schedule exists. |

### batchGetScheduleSummaries

```solidity
function batchGetScheduleSummaries(uint256[] scheduleIds) external view returns (struct ScheduleSummary[])
```

Returns an array of summary structs for the specified schedules.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleIds | uint256[] | The token IDs of the schedules for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ScheduleSummary[] | Returns an array of &#x60;ScheduleSummary&#x60; structs containing the summary of the schedules. |

### claimableBalanceForSchedule

```solidity
function claimableBalanceForSchedule(uint256 scheduleId) external view returns (uint256)
```

Released balance less the total claimed amount at current block timestamp for a schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The token ID of the schedule for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Returns the claimable amount for the schedule. |

### claimableBalanceForScheduleForAccount

```solidity
function claimableBalanceForScheduleForAccount(uint256 scheduleId, address account) external view returns (uint256)
```

A single account's claimable balance at current block timestamp for a schedule.

<i>Calculations have to consider an account's total proportional claim to the schedule's released tokens,
using totals constructed from current balances and claimed amounts, and then subtract anything that
account has already claimed.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The token ID of the schedule for which to retrieve details. |
| account | address | The account for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Returns the claimable amount for an account&#x27;s schedule. |

### revocableQuantityForSchedule

```solidity
function revocableQuantityForSchedule(uint256 scheduleId) external view returns (uint256)
```

Get the current number of revocable tokens for a given schedule at the current block timestamp.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The schedule ID for which to revoke tokens. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Returns the number of revocable tokens for a given schedule at the current block timestamp. |

### setRestrictionDurationForMethodologyAndVersion

```solidity
function setRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion, uint256 durationInSeconds) public
```

Set the restriction duration for a methodology and version.

<i>Set the duration in seconds that should be applied to schedules created on behalf of removals
originating from the given methodology and methodology version.

##### Requirements:

- Can only be used when the contract is not paused.
- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| methodology | uint256 | The methodology of carbon removal. |
| methodologyVersion | uint256 | The version of the methodology. |
| durationInSeconds | uint256 | The duration in seconds that insurance funds should be restricted for this methodology and version. |


### getUnderlyingTokenAddress

```solidity
function getUnderlyingTokenAddress() public view returns (address)
```

Get the address of the underlying ERC20 token being wrapped by this contract.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the underlying ERC20 token being wrapped by this contract. |

### getScheduleSummary

```solidity
function getScheduleSummary(uint256 scheduleId) public view returns (struct ScheduleSummary)
```

Get a summary for a schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The token ID of the schedule for which to retrieve details. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ScheduleSummary | Returns the schedule summary. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```


<i>See [IERC165.supportsInterface](
https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface ID to check for support. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if the interface is supported, false otherwise. |

### getRestrictionDurationForMethodologyAndVersion

```solidity
function getRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion) public view returns (uint256)
```

Get the schedule duration (in seconds) that has been set for a given methodology and methodology version.


| Name | Type | Description |
| ---- | ---- | ----------- |
| methodology | uint256 | The methodology of carbon removal. |
| methodologyVersion | uint256 | The version of the methodology. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Returns the schedule duration in seconds. |

### safeTransferFrom

```solidity
function safeTransferFrom(address, address, uint256, uint256, bytes) public pure
```

Token transfers are disabled.

<i>Transfer is disabled because keeping track of claimable amounts as tokens are
claimed and transferred requires more bookkeeping infrastructure that we don't currently
have time to write but may implement in the future.</i>



### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address, address, uint256[], uint256[], bytes) public pure
```

Token transfers are disabled.

<i>Transfer is disabled because keeping track of claimable amounts as tokens are
claimed and transferred requires more bookkeeping infrastructure that we don't currently
have time to write but may implement in the future.</i>



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
| projectId | uint256 | The ID that will be used as the new schedule's ID. |
| startTime | uint256 | The schedule start time in seconds since the unix epoch. |
| restrictionDuration | uint256 | The duration of the schedule in seconds since the unix epoch. |


### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called before any token transfer. This includes minting and burning, as well as batched
variants.

<i>Follows the rules of hooks defined [here](
https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

See the ERC1155 specific version [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155).

##### Requirements:

- The contract must not be paused.
- One of the following must be true:
   - The operation is a mint.
   - The operation is a burn, which only happens during revocation and withdrawal:
     - If the operation is a revocation, that permission is enforced by the `TOKEN_REVOKER_ROLE`.
     - If the operation is a withdrawal the burn amount must be <= the sender's claimable balance.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| operator | address | The address which initiated the transfer (i.e. msg.sender). |
| from | address | The address to transfer from. |
| to | address | The address to transfer to. |
| ids | uint256[] | The token IDs to transfer. |
| amounts | uint256[] | The amounts of the token `id`s to transfer. |
| data | bytes | The data to pass to the receiver contract. |


### _validateSchedule

```solidity
function _validateSchedule(uint256 startTime, uint256 restrictionDuration) internal pure
```

Validates that the schedule start time and duration are non-zero.


| Name | Type | Description |
| ---- | ---- | ----------- |
| startTime | uint256 | The schedule start time in seconds since the unix epoch. |
| restrictionDuration | uint256 | The duration of the schedule in seconds since the unix epoch. |




