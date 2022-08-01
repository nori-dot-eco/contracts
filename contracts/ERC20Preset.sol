// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "./PausableAccessPreset.sol";

// todo AUDIT https://norinauts.slack.com/archives/C023A5VN86R/p1656529393031139
abstract contract ERC20Preset is
  ERC20BurnableUpgradeable,
  ERC20PermitUpgradeable,
  MulticallUpgradeable,
  PausableAccessPreset
{
  function __ERC20Preset_init_unchained() internal onlyInitializing {
    // solhint-disable-previous-line func-name-mixedcase
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @notice A hook that is called before a token transfer occurs.
   *
   * @dev When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
   * [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override whenNotPaused {
    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @notice See ERC20-approve for more details [here](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20-approve-address-uint256-)
   *
   * @dev This override applies the `whenNotPaused` to the `approve`, `increaseAllowance`, `decreaseAllowance`,
   * and `_spendAllowance` (used by `transferFrom`) functions.
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - Accounts cannot have allowance issued by their operators.
   * - If `value` is the maximum `uint256`, the allowance is not updated on `transferFrom`. This is semantically
   * equivalent to an infinite approval.
   * - `owner` cannot be the zero address.
   * - The `spender` cannot be the zero address.
   */
  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual override whenNotPaused {
    return super._approve(owner, spender, amount);
  }
}
