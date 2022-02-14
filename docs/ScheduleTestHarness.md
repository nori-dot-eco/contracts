# ScheduleTestHarness









## Methods

### addCliff

```solidity
function addCliff(uint256 scheduleId, uint256 time, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| scheduleId | uint256 | undefined
| time | uint256 | undefined
| amount | uint256 | undefined

### availableAmount

```solidity
function availableAmount(uint256 scheduleId, uint256 atTime) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| scheduleId | uint256 | undefined
| atTime | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### create

```solidity
function create(uint256 startTime, uint256 endTime, uint256 totalAmount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| startTime | uint256 | undefined
| endTime | uint256 | undefined
| totalAmount | uint256 | undefined

### truncateScheduleAmount

```solidity
function truncateScheduleAmount(uint256 scheduleId, uint256 atTime) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| scheduleId | uint256 | undefined
| atTime | uint256 | undefined



## Events

### CliffAdded

```solidity
event CliffAdded(uint256 id, uint256 time, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint256 | undefined |
| time  | uint256 | undefined |
| amount  | uint256 | undefined |

### ScheduleCreated

```solidity
event ScheduleCreated(uint256 id, uint256 startTime, uint256 endTime, uint256 totalAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint256 | undefined |
| startTime  | uint256 | undefined |
| endTime  | uint256 | undefined |
| totalAmount  | uint256 | undefined |

### ScheduleTruncated

```solidity
event ScheduleTruncated(uint256 id, uint256 balance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint256 | undefined |
| balance  | uint256 | undefined |



