## ERC20Preset


TODO question for the auditors:
The OZ upgrades plugin flags the use of &#x60;delegatecall&#x60; as unsafe to use with upgradeable contracts,
but this is necessary to use if inheriting from Multicall because multicall uses it.
Is this a false positive? And is it ok that we specify explicit &#x60;unsafeAllow&#x60; for &#x60;delegatecall&#x60;?




---

### __ERC20Preset_init_unchained

```solidity
function __ERC20Preset_init_unchained() internal
```






### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual
```

A hook that is called before a token transfer occurs.

_When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
[here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused._



### _approve

```solidity
function _approve(address owner, address spender, uint256 amount) internal virtual
```

See ERC20-approve for more details [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20-approve-address-uint256-)

_This override applies the &#x60;whenNotPaused&#x60; to the &#x60;approve&#x60;, &#x60;increaseAllowance&#x60;, &#x60;decreaseAllowance&#x60;,
and &#x60;_spendAllowance&#x60; (used by &#x60;transferFrom&#x60;) functions.

##### Requirements:

- The contract must not be paused.
- Accounts cannot have allowance issued by their operators.
- If &#x60;value&#x60; is the maximum &#x60;uint256&#x60;, the allowance is not updated on &#x60;transferFrom&#x60;. This is semantically
equivalent to an infinite approval.
- &#x60;owner&#x60; cannot be the zero address.
- The &#x60;spender&#x60; cannot be the zero address._





