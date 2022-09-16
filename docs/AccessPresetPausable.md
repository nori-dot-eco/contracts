## AccessPresetPausable






---

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

Role conferring pausing and unpausing of this contract.




### pause

```solidity
function pause() external
```

Pauses all functions that can mutate state.

<i>Used to effectively freeze a contract so that no state updates can occur.  
##### Requirements:
 
- The caller must have the &#x60;PAUSER_ROLE&#x60;.</i>



### unpause

```solidity
function unpause() external
```

Unpauses all token transfers.

<i>Re-enables functionality that was paused by &#x60;pause&#x60;.  
##### Requirements:
 
- The caller must have the &#x60;PAUSER_ROLE&#x60;.</i>



### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```

Grants a role to an account.

<i>Grants &#x60;role&#x60; to &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60; hook is satisfied  
##### Requirements:
 
- The contract must not be paused.</i>



### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

Revokes a role from an account.

<i>Revokes &#x60;role&#x60; from &#x60;account&#x60; if the &#x60;_beforeRoleGranted&#x60; hook is satisfied  
##### Requirements:
 
- The contract must not be paused.</i>





