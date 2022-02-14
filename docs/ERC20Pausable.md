# ERC20Pausable



> Pausable token



*ERC20 modified with pausable transfers.*

## Methods

### approve

```solidity
function approve(address spender, uint256 value) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined
| value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```



*Total number of tokens in existence*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 value) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined
| to | address | undefined
| value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable returns (bool success)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined
| addedValue | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined

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






### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```



*Gets the balance of the specified address.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | The address to query the balance of.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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


### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable returns (bool success)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined
| subtractedValue | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined

### transfer

```solidity
function transfer(address to, uint256 value) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined
| value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### initialize

```solidity
function initialize(address sender) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```



*Function to check the amount of tokens that an owner allowed to a spender.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | address The address which owns the funds.
| spender | address | address The address which will spend the funds.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined



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

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| value  | uint256 | undefined |

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value  | uint256 | undefined |



