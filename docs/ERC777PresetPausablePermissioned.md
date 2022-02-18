## ERC777PresetPausablePermissioned







---

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

Role conferring the ability to pause and unpause mutable functions
of the contract




### __gap

```solidity
uint256[50] __gap
```



_This empty reserved space is put in place to allow future versions to add new
variables without shifting down storage in the inheritance chain.
See more [here](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)_



### approve

```solidity
function approve(address spender, uint256 value) public virtual returns (bool)
```



_See {ERC777-approve}.
NOTE: If &#x60;value&#x60; is the maximum &#x60;uint256&#x60;, the allowance is not updated on
&#x60;transferFrom&#x60;. This is semantically equivalent to an infinite approval.
Note that accounts cannot have allowance issued by their operators.
##### Requirements:
- the contract must not be paused_



### authorizeOperator

```solidity
function authorizeOperator(address operator) public virtual
```

Authorize an operator to spend on behalf of the sender

_See {IERC777-authorizeOperator}.
##### Requirements:
- the contract must not be paused_



### revokeOperator

```solidity
function revokeOperator(address operator) public virtual
```

Revoke an operator to disable their ability to spend on behalf of the sender

_See {IERC777-authorizeOperator}.
##### Requirements:
- the contract must not be paused_



### pause

```solidity
function pause() public
```



_Pauses all token transfers.
Requirements:
- the caller must have the &#x60;PAUSER_ROLE&#x60;._



### unpause

```solidity
function unpause() public
```



_Unpauses all token transfers.
Requirements:
- the caller must have the &#x60;PAUSER_ROLE&#x60;._



### __ERC777PresetPausablePermissioned_init_unchained

```solidity
function __ERC777PresetPausablePermissioned_init_unchained() internal
```






### _beforeOperatorChange

```solidity
function _beforeOperatorChange(address, uint256) internal virtual
```



_Hook that is called before granting/revoking operator allowances
This overrides the behavior of &#x60;approve&#x60;, &#x60;authorizeOperator, and &#x60;revokeOperator&#x60; with pausable behavior.
When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
[here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
##### Requirements:
- the contract must not be paused_



### _beforeRoleChange

```solidity
function _beforeRoleChange(bytes32, address) internal virtual
```



_Hook that is called before granting/revoking roles via &#x60;grantRole&#x60;, &#x60;revokeRole&#x60;, &#x60;renounceRole&#x60;
This overrides the behavior of &#x60;_grantRole&#x60;, &#x60;_setupRole&#x60;, &#x60;_revokeRole&#x60;, and &#x60;_renounceRole&#x60; with pausable
behavior. When the contract is paused, these functions will not be callable. Follows the rules of hooks
defined [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
##### Requirements:
- the contract must not be paused_



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal virtual
```

Requirements:
- the contract must not be paused.




### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```



_Grants &#x60;role&#x60; to &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60;
hook is satisfied
##### Requirements:
- the contract must not be paused_



### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```



_Revokes &#x60;role&#x60; from &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60;
hook is satisfied
##### Requirements:
- the contract must not be paused_





