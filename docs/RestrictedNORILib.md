## RestrictedNORILib


This library contains logic for restriction schedules used by the RestrictedNORI contract.

##### Behaviors and features:

###### Time

All time parameters are in unix time for ease of comparison with `block.timestamp`.

##### Uses:

- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
for `EnumerableSetUpgradeable.UintSet`
- RestrictedNORILib for `Schedule`




---

### releasedBalanceOfSingleSchedule

```solidity
function releasedBalanceOfSingleSchedule(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```

Get the total amount of released tokens available at the current block timestamp for the schedule.

<i>Takes the maximum of either the calculated linearly released amount based on the schedule parameters,
or the released amount floor, which is set at the current released amount whenever the balance of a
schedule is decreased through revocation or withdrawal.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to calculate the released amount for. |
| totalSupply | uint256 | The total supply of tokens for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of released tokens available at the current block timestamp for the schedule. |

### linearReleaseAmountAvailable

```solidity
function linearReleaseAmountAvailable(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```

Get the linearly released balance for a single schedule at the current block timestamp, ignoring any
released amount floor that has been set for the schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to calculate the released amount for. |
| totalSupply | uint256 | The total supply of tokens for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of released tokens available at the current block timestamp for the schedule. |

### scheduleTrueTotal

```solidity
function scheduleTrueTotal(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```

Reconstruct a schedule's true total based on claimed and unclaimed tokens.

<i>Claiming burns the ERC1155 token, so the true total of a schedule has to be reconstructed
from the `totalSupply` and any claimed amount.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to calculate the true total for. |
| totalSupply | uint256 | The total supply of tokens for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The true total of the schedule. |

### claimableBalanceForSchedule

```solidity
function claimableBalanceForSchedule(struct Schedule schedule, uint256 scheduleId, uint256 totalSupply) internal view returns (uint256)
```

Get the released balance less the total claimed amount at current block timestamp for a schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to calculate the claimable amount for. |
| scheduleId | uint256 |  |
| totalSupply | uint256 | The total supply of tokens for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The released balance less the total claimed amount at current block timestamp for a schedule. |

### claimableBalanceForScheduleForAccount

```solidity
function claimableBalanceForScheduleForAccount(struct Schedule schedule, address account, uint256 totalSupply, uint256 balanceOfAccount) internal view returns (uint256)
```

A single account's claimable balance at current `block.timestamp` for a schedule.

<i>Calculations have to consider an account's total proportional claim to the schedule's released tokens,
using totals constructed from current balances and claimed amounts, and then subtract anything that
account has already claimed.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to calculate the claimable amount for. |
| account | address | The account to calculate the claimable amount for. |
| totalSupply | uint256 | The total supply of tokens for the schedule. |
| balanceOfAccount | uint256 | The current balance of the account for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The claimable balance for the account at current &#x60;block.timestamp&#x60; for a schedule. |

### revocableQuantityForSchedule

```solidity
function revocableQuantityForSchedule(struct Schedule schedule, uint256 scheduleId, uint256 totalSupply) internal view returns (uint256)
```

Check the revocable balance of a schedule.


| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to check the revocable balance for. |
| scheduleId | uint256 | The schedule ID to check the revocable balance for. |
| totalSupply | uint256 | The total supply of tokens for the schedule. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The current number of revocable tokens for a given schedule at the current block timestamp. |

### doesExist

```solidity
function doesExist(struct Schedule schedule) internal view returns (bool)
```

Check if a schedule exists.


| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule | The schedule to check. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the schedule exists, false otherwise. |



