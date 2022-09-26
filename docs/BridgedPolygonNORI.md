## BridgedPolygonNORI


The NORI (bpNORI) token on Polygon is a wrapped version of the NORI token on Ethereum.

<i>This token is a layer-2 (L2) equivalent of the respective layer-1 (L1) NORI contract with extended
functionality to enable deposits and withdrawals between L1 and L2.

##### Behaviors and features:

###### Deposits

A user can bridge their L1 Ethereum NORI in return for layer-2 bpNORI by depositing NORI on the L1
bridge. The user will receive an equivalent amount of bpNORI on L2. Deposits on L1 do not change the total supply of
NORI and instead escrow their tokens to the bridge address.

###### Withdrawals

A user can withdraw their L2 bpNORI in return for L1 NORI by burning their bpNORI on L2 and submitting a withdrawal.
A withdrawal decreases the L2 supply of bpNORI in a value equivalent to the amount withdrawn. The user will receive
NORI on L1 in a value equivalent to the amount withdrawn.

##### Inherits:

- [ERC20Preset](../docs/ERC20Preset.md)</i>



---

### DEPOSITOR_ROLE

```solidity
bytes32 DEPOSITOR_ROLE
```

A role conferring the ability to mint/deposit bpNORI on Polygon.




### constructor

```solidity
constructor() public
```

Locks the contract, preventing any future re-initialization.

<i>See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).</i>



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


| Name | Type | Description |
| ---- | ---- | ----------- |
| childChainManagerProxy | address | the address of the child chain manager proxy which can mint/deposit bpNORI on L2. |




