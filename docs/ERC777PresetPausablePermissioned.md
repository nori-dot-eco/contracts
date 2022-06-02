## ERC777PresetPausablePermissioned







---

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

Role conferring the ability to pause and unpause mutable functions of the contract




### __gap

```solidity
uint256[50] __gap
```

Reserved storage slot for upgradeability

_This empty reserved space is put in place to allow future versions to add new variables without shifting
down storage in the inheritance chain. See more [here](
https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)_



### SentBatch

```solidity
event SentBatch(address from, address[] recipients, uint256[] amounts, bytes[] userData, bytes[] operatorData, bool[] requireReceptionAck)
```

An event emitted when a batch of transfers are bundled into a single transaction




### batchSend

```solidity
function batchSend(address[] recipients, uint256[] amounts, bytes[] userData, bytes[] operatorData, bool[] requireReceptionAck) public
```

Batches multiple transfers into a single transaction


| Name | Type | Description |
| ---- | ---- | ----------- |
| recipients | address[] | address[] list of recipient addresses |
| amounts | uint256[] | uint256[] list of amounts to transfer |
| userData | bytes[] | bytes[] list of extra information provided by the token holder (if any) |
| operatorData | bytes[] | bytes[] list of extra information provided by the operator (if any) |
| requireReceptionAck | bool[] | list of requirements (if true, contract recipients are required to implement ERC777TokensRecipient) Emits a SendBatch event. ##### Requirements: - The contract must not be paused. |


### approve

```solidity
function approve(address spender, uint256 value) public virtual returns (bool)
```

See ERC777-approve for details [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#ERC777-approve-address-uint256-)

_This function is a wrapper around ERC777-approve.

##### Requirements:

- The contract must not be paused.
- Accounts cannot have allowance issued by their operators.
- If &#x60;value&#x60; is the maximum &#x60;uint256&#x60;, the allowance is not updated on &#x60;transferFrom&#x60;. This is semantically
equivalent to an infinite approval._



### authorizeOperator

```solidity
function authorizeOperator(address operator) public virtual
```

Authorize an operator to spend on behalf of the sender

_See IERC777-authorizeOperator for details [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777-authorizeOperator-address-)

##### Requirements:

- The contract must not be paused._



### revokeOperator

```solidity
function revokeOperator(address operator) public virtual
```

Revoke an operator to disable their ability to spend on behalf of the sender

_See IERC777-authorizeOperator for details [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777-authorizeOperator-address-)

##### Requirements:

- The contract must not be paused._



### pause

```solidity
function pause() public
```

Pauses all functions that can mutate state

_Used to effectively freeze a contract so that no state updates can occur

##### Requirements:

- The caller must have the &#x60;PAUSER_ROLE&#x60;._



### unpause

```solidity
function unpause() public
```

Unpauses **all** token transfers.

@dev

##### Requirements:

- The caller must have the &#x60;PAUSER_ROLE&#x60;.




### balanceOfBatch

```solidity
function balanceOfBatch(address[] accounts) public view returns (uint256[])
```

Returns the balances of a batch of addresses in a single call




### __ERC777PresetPausablePermissioned_init_unchained

```solidity
function __ERC777PresetPausablePermissioned_init_unchained() internal
```






### _beforeOperatorChange

```solidity
function _beforeOperatorChange(address, uint256) internal virtual
```

Hook that is called before granting/revoking operator allowances

_This overrides the behavior of &#x60;approve&#x60;, &#x60;authorizeOperator, and &#x60;revokeOperator&#x60; with pausable behavior.
When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
[here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused._



### _beforeRoleChange

```solidity
function _beforeRoleChange(bytes32, address) internal virtual
```

Hook that is called before granting/revoking roles via &#x60;grantRole&#x60;, &#x60;revokeRole&#x60;, &#x60;renounceRole&#x60;

_This overrides the behavior of &#x60;_grantRole&#x60;, &#x60;_setupRole&#x60;, &#x60;_revokeRole&#x60;, and &#x60;_renounceRole&#x60; with pausable
behavior. When the contract is paused, these functions will not be callable. Follows the rules of hooks
defined [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused._



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal virtual
```

A hook that is called before a token transfer occurs.

_When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
[here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused._



### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```

Grants a role to an account.

_Grants &#x60;role&#x60; to &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60; hook is satisfied

##### Requirements:

- The contract must not be paused.
- The requirements of _beforeRoleGranted_ must be satisfied._



### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

Revokes a role from an account.

_Revokes &#x60;role&#x60; from &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60; hook is satisfied

##### Requirements:

- The contract must not be paused.
- The requirements of _beforeRoleGranted_ must be satisfied._





