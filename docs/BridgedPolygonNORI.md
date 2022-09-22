## BridgedPolygonNORI






---

### DEPOSITOR_ROLE

```solidity
bytes32 DEPOSITOR_ROLE
```





### constructor

```solidity
constructor() public
```





### deposit

```solidity
function deposit(address user, bytes depositData) external
```

Deposit NORI on the root chain (Ethereum) to the child chain (Polygon) as bpNORI.

<i>A deposit of NORI on the root chain (Ethereum) will trigger this function and mint bpNORI on the child chain
(Polygon). This function can only be called by the ChildChainManager. See [here](
https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user which deposited on the root chain (Ethereum) and which is receiving the bpNORI. |
| depositData | bytes | The ABI encoded deposit amount. |


### withdraw

```solidity
function withdraw(uint256 amount) external
```

Withdraw bpNORI tokens from the child chain (Polygon) to the root chain (Ethereum) as NORI.

<i>Burns user's tokens on polygon. This transaction will be verified when exiting on root chain. See [here](
https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of tokens to withdraw from polygon as NORI on layer one. |


### initialize

```solidity
function initialize(address childChainManagerProxy) external
```

Initialize the BridgedPolygonNORI contract.






