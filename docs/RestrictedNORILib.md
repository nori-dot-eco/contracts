## RestrictedNORILib



<i>Library encapsulating the logic around restriction schedules.

All time parameters are in unix time for ease of comparison with `block.timestamp`.</i>



---

### releasedBalanceOfSingleSchedule

```solidity
function releasedBalanceOfSingleSchedule(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```


<i>The total amount of released tokens available at the current block timestamp for the schedule.
Takes the maximum of either the calculated linearly released amount based on the schedule parameters,
or the released amount floor, which is set at the current released amount whenever the balance of a
schedule is decreased through revocation or withdrawal.</i>



### linearReleaseAmountAvailable

```solidity
function linearReleaseAmountAvailable(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```

Linearly released balance for a single schedule at the current block timestamp, ignoring any
released amount floor that has been set for the schedule.




### scheduleTrueTotal

```solidity
function scheduleTrueTotal(struct Schedule schedule, uint256 totalSupply) internal view returns (uint256)
```

Reconstructs a schedule's true total based on claimed and unclaimed tokens.

<i>Claiming burns the ERC1155 token, so the true total of a schedule has to be reconstructed
from the `totalSupply` and any claimed amount.</i>



### claimableBalanceForSchedule

```solidity
function claimableBalanceForSchedule(struct Schedule schedule, uint256 scheduleId, uint256 totalSupply) internal view returns (uint256)
```

Released balance less the total claimed amount at current block timestamp for a schedule.




### claimableBalanceForScheduleForAccount

```solidity
function claimableBalanceForScheduleForAccount(struct Schedule schedule, uint256 scheduleId, address account, uint256 totalSupply, uint256 balanceOfAccount) internal view returns (uint256)
```

A single account's claimable balance at current `block.timestamp` for a schedule.

<i>Calculations have to consider an account's total proportional claim to the schedule's released tokens,
using totals constructed from current balances and claimed amounts, and then subtract anything that
account has already claimed.</i>



### revocableQuantityForSchedule

```solidity
function revocableQuantityForSchedule(struct Schedule schedule, uint256 scheduleId, uint256 totalSupply) internal view returns (uint256)
```

Returns the current number of revocable tokens for a given schedule at the current block timestamp.




### doesExist

```solidity
function doesExist(struct Schedule schedule) internal view returns (bool)
```

Returns the existence of a schedule.






