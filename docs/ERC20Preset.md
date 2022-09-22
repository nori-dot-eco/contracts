## ERC20Preset






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

<i>Follows the rules of hooks defined [here](
https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused.</i>



### _approve

```solidity
function _approve(address owner, address spender, uint256 amount) internal virtual
```

See ERC20-approve for more details [here](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20-approve-address-uint256-)

<i>This override applies the `whenNotPaused` to the `approve`, `increaseAllowance`, `decreaseAllowance`,
and `_spendAllowance` (used by `transferFrom`) functions.

##### Requirements:

- The contract must not be paused.
- Accounts cannot have allowance issued by their operators.
- If `value` is the maximum `uint256`, the allowance does not update `transferFrom`. This is semantically
equivalent to an infinite approval.
- `owner` cannot be the zero address.
- The `spender` cannot be the zero address.</i>





