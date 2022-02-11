## NORI







---

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```






### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```






### initialize

```solidity
function initialize() public
```






### mint

```solidity
function mint(address account, uint256 amount, bytes userData, bytes operatorData) public
```



_Creates &#x60;amount&#x60; new tokens for &#x60;account&#x60;.
Requirements:
- the caller must have the &#x60;MINTER_ROLE&#x60;._



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



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal
```

Requirements:
- the contract must not be paused.






