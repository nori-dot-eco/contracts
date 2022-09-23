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

- The caller must have the `PAUSER_ROLE`.</i>



### unpause

```solidity
function unpause() external
```

Unpauses all token transfers.

<i>Re-enables functionality that was paused by `pause`.

##### Requirements:

- The caller must have the `PAUSER_ROLE`.</i>



### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```

Grants a role to an account.

##### Requirements:

- The contract must not be paused.




### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

Revokes a role from an account.

##### Requirements:

- The contract must not be paused.






