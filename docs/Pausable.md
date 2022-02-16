# Pausable



> Pausable



*Base contract which allows children to implement an emergency stop mechanism.*

## Methods

### unpause

```solidity
function unpause() external nonpayable
```



*called by the owner to unpause, returns to normal state*


### isPauser

```solidity
function isPauser(address account) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### paused

```solidity
function paused() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### renouncePauser

```solidity
function renouncePauser() external nonpayable
```






### addPauser

```solidity
function addPauser(address account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

### pause

```solidity
function pause() external nonpayable
```



*called by the owner to pause, triggers stopped state*


### initialize

```solidity
function initialize(address sender) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined



## Events

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### PauserAdded

```solidity
event PauserAdded(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |

### PauserRemoved

```solidity
event PauserRemoved(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |



