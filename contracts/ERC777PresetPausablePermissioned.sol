// SPDX-License-Identifier: MIT
pragma solidity =0.8.12;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

contract ERC777PresetPausablePermissioned is
  ERC777Upgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  /**
   * @notice Role conferring the ability to pause and unpause mutable functions
   * of the contract
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See more [here](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)
   */
  uint256[50] private __gap;

  /**
   * @dev See {ERC777-approve}.
   *
   * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
   * `transferFrom`. This is semantically equivalent to an infinite approval.
   *
   * Note that accounts cannot have allowance issued by their operators.
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function approve(address spender, uint256 value)
    public
    virtual
    override
    whenNotPaused
    returns (bool)
  {
    _beforeOperatorChange(spender, value);
    return super.approve(spender, value);
  }

  /**
   * @notice Authorize an operator to spend on behalf of the sender
   * @dev See {IERC777-authorizeOperator}.
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function authorizeOperator(address operator) public virtual override {
    _beforeOperatorChange(operator, 0);
    return super.authorizeOperator(operator);
  }

  /**
   * @notice Revoke an operator to disable their ability to spend on behalf of the sender
   * @dev See {IERC777-authorizeOperator}.
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function revokeOperator(address operator) public virtual override {
    _beforeOperatorChange(operator, 0);
    return super.revokeOperator(operator);
  }

  /**
   * @dev Pauses all token transfers.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  function __ERC777PresetPausablePermissioned_init_unchained()
    internal
    onlyInitializing
  {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Hook that is called before granting/revoking operator allowances
   *
   * This overrides the behavior of `approve`, `authorizeOperator, and `revokeOperator` with pausable behavior.
   * When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
   * [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function _beforeOperatorChange(address, uint256)
    internal
    virtual
    whenNotPaused
  {} // solhint-disable-line no-empty-blocks

  /**
   * @dev Hook that is called before granting/revoking roles via `grantRole`, `revokeRole`, `renounceRole`
   *
   * This overrides the behavior of `_grantRole`, `_setupRole`, `_revokeRole`, and `_renounceRole` with pausable
   * behavior. When the contract is paused, these functions will not be callable. Follows the rules of hooks
   * defined [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function _beforeRoleChange(bytes32, address) internal virtual whenNotPaused {} // solhint-disable-line no-empty-blocks

  /**
   * Requirements:
   *
   * - the contract must not be paused.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 amount
  ) internal virtual override whenNotPaused {
    super._beforeTokenTransfer(operator, from, to, amount);
  }

  /**
   * @dev Grants `role` to `account` if the `_beforeRoleGranted`
   * hook is satisfied
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function _grantRole(bytes32 role, address account) internal virtual override {
    _beforeRoleChange(role, account);
    super._grantRole(role, account);
  }

  /**
   * @dev Revokes `role` from `account` if the `_beforeRoleGranted`
   * hook is satisfied
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   */
  function _revokeRole(bytes32 role, address account)
    internal
    virtual
    override
  {
    _beforeRoleChange(role, account);
    super._revokeRole(role, account);
  }
}
