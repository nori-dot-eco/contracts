## LockedNORILib


Library encapsulating the logic around timed release schedules with cliffs.

<i>Supports an arbitrary number of stepwise cliff releases beyond which the remaining amount is released linearly
from the time of the final cliff to the end date.

All time parameters are in unix time for ease of comparison with `block.timestamp` although all methods on
`LockedNORILib` take `atTime` as a parameter and do not directly reason about the current `block.timestamp`.</i>



---

### addCliff

```solidity
function addCliff(struct Schedule schedule, uint256 time, uint256 amount) internal
```


<i>Add a cliff defined by the time and amount to the schedule.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| schedule | struct Schedule |  |
| time | uint256 | must be >= any existing cliff, >= `schedule.startTime and` <= `schedule.endTime` |
| amount | uint256 | must be <= (`schedule.totalAmount` - total of existing cliffs) |


### cliffAmountsAvailable

```solidity
function cliffAmountsAvailable(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```


<i>The total of unlocked cliff amounts in `schedule` at time `atTime`</i>



### linearReleaseAmountAvailable

```solidity
function linearReleaseAmountAvailable(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```


<i>The total amount of the linear (post-cliff) release available at `atTime`

Will always be zero prior to the final cliff time and then increases linearly
until `schedule.endTime`.</i>



### availableAmount

```solidity
function availableAmount(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```


<i>The total amount available at `atTime`

Will always be zero prior to `schedule.startTime` and `amount`
after `schedule.endTime`.

Equivalent to `cliffAmountsAvailable + linearReleaseAmountAvailable`.</i>





