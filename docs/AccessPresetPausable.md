## AccessPresetPausable


This preset contract affords an inheriting contract a set of standard functionality that allows role-based
access control and pausable functions.

<i>This contract is inherited by most of the other contracts in this project.

##### Inherits:

- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](
https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)</i>



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

<i>This function allows the role's admin to grant the role to other accounts.

##### Requirements:

- The contract must not be paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The role to grant. |
| account | address | The account to grant the role to. |


### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

Revokes a role from an account.

<i>This function allows the role's admin to revoke the role from other accounts.

##### Requirements:

- The contract must not be paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The role to revoke. |
| account | address | The account to revoke the role from. |




