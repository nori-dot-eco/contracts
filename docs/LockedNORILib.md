## LockedNORILib




_Library encapsulating the logic around timed release schedules with cliffs.
Supports an arbitrary number of stepwise cliff releases beyond which the remaining
amount is released linearly from the time of the final cliff to the end date.
All time parameters are in unixtime for ease of comparison with block.timestamp
although all methods on LockedNORILib take *atTime* as a parameter and do not
directly reason about the current block timestamp.
See also {LockedNORILibTestHarness.sol} for a simple use of this library
for unit testing purposes.
NOTE: All methods are internal so this library gets inlined into the consuming
contract and does not need to be deployed separately.
Designed to be used i.e.:
&#x60;&#x60;&#x60;
 using LockedNORILib for Schedule;
 mapping(address &#x3D;&gt; Schedule) schedules &#x3D; Schedules;
 Schedule s &#x3D; schedules[account];
 s.startTime &#x3D; 1644436100;
 s.endTime &#x3D; 1645436100;
 s.totalAmount &#x3D; 1000000;
 s.addCliff(1644436200, 50000);
 s.amountAvailable(1644436200);
&#x60;&#x60;&#x60;_



---

### addCliff

```solidity
function addCliff(struct Schedule schedule, uint256 time, uint256 amount) internal
```



_Adds a cliff defined by *time* and *amount* to *schedule*

time* must be &gt;&#x3D; any existing cliff, &gt;&#x3D; schedule.startTime and &lt;&#x3D; schedule.endTime

amount* must be &lt;&#x3D; (schedule.totalAmount - total of existing cliffs)_



### cliffAmountsAvailable

```solidity
function cliffAmountsAvailable(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```



_The total of unlocked cliff amounts in *schedule* at time *atTime*_



### linearReleaseAmountAvailable

```solidity
function linearReleaseAmountAvailable(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```



_The total amount of the linear (post-cliff) release available at *atTime*
Will always be zero prior to the final cliff time and then increases linearly
util *schedule.endTime*._



### availableAmount

```solidity
function availableAmount(struct Schedule schedule, uint256 atTime) internal view returns (uint256)
```



_The total amount available at *atTime*
Will always be zero prior to *schedule.startTime* and *amount*
after *schedule.endTime*.
Equivalent to cliffAmountsAvailable + linearReleaseAmountAvailable._





