## BridgedPolygonNORI







---

### DEPOSITOR_ROLE

```solidity
bytes32 DEPOSITOR_ROLE
```






### deposit

```solidity
function deposit(address user, bytes depositData) external
```

called when token is deposited on root chain

_Should be callable only by ChildChainManager
Should handle deposit by minting the required amount for user
Make sure minting is done only by this function_

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address for whom deposit is being done |
| depositData | bytes | abi encoded amount |


### withdraw

```solidity
function withdraw(uint256 amount) external
```

called when user wants to withdraw tokens back to root chain

_Should burn user&#x27;s tokens. This transaction will be verified when exiting on root chain_

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount of tokens to withdraw |


### initialize

```solidity
function initialize(address childChainManagerProxy) public
```

initializes the BridgedPolygonNORI contract




### __BridgedPolygonNORI_init

```solidity
function __BridgedPolygonNORI_init(address childChainManagerProxy) internal
```

Initializer variant that embeds the linearized calls to all parent initializers.

_Follows the multiple inheritance initializer rules defined [here](
https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
calling two of these init functions can potentially initialize the same contract twice._



### __BridgedPolygonNORI_init_unchained

```solidity
function __BridgedPolygonNORI_init_unchained(address childChainManagerProxy) internal
```

Initializer variant that does **not** embed linearized calls to any parent initializers.

_Follows the multiple inheritance initializer rules defined [here](
https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
calling two of these init functions can potentially initialize the same contract twice._





