# ERC20Mintable



> ERC20Mintable



*ERC20 minting logic*

## Methods

### approve

```solidity
function approve(address spender, uint256 value) external nonpayable returns (bool)
```



*Approve the passed address to spend the specified amount of tokens on behalf of msg.sender. Beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender&#39;s allowance to 0 and set the desired value afterwards: https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | The address which will spend the funds.
| value | uint256 | The amount of tokens to be spent.

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



*Transfer tokens from one address to another. Note that while this function emits an Approval event, this is not required as per the specification, and other compliant implementations may not emit the event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | address The address which you want to send tokens from
| to | address | address The address which you want to transfer to
| value | uint256 | uint256 the amount of tokens to be transferred

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable returns (bool)
```



*Increase the amount of tokens that an owner allowed to a spender. approve should be called when _allowances[msg.sender][spender] == 0. To increment allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined) From MonolithDAO Token.sol Emits an Approval event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | The address which will spend the funds.
| addedValue | uint256 | The amount of tokens to increase the allowance by.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### mint

```solidity
function mint(address to, uint256 value) external nonpayable returns (bool)
```



*Function to mint tokens*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The address that will receive the minted tokens.
| value | uint256 | The amount of tokens to mint.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

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

### addMinter

```solidity
function addMinter(address account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

### renounceMinter

```solidity
function renounceMinter() external nonpayable
```






### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable returns (bool)
```



*Decrease the amount of tokens that an owner allowed to a spender. approve should be called when _allowances[msg.sender][spender] == 0. To decrement allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined) From MonolithDAO Token.sol Emits an Approval event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | The address which will spend the funds.
| subtractedValue | uint256 | The amount of tokens to decrease the allowance by.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### transfer

```solidity
function transfer(address to, uint256 value) external nonpayable returns (bool)
```



*Transfer token to a specified address*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The address to transfer to.
| value | uint256 | The amount to be transferred.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### isMinter

```solidity
function isMinter(address account) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

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

### MinterAdded

```solidity
event MinterAdded(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |

### MinterRemoved

```solidity
event MinterRemoved(address indexed account)
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



