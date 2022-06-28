// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

// todo burnFrom from burnpreset
// todo initializers in implementers such as bpNORI and NORI (__ERC20Burnable_init_unchained)
// todo OZ erc20 pausable checks if paused AFTER _beforeTokenTransfer (do we need to do this? Possible miss in our 777 preset)
// todo investigate multicall as alternatibe batch function executor
// todo check if we need to override any public overrideable fuctions in erc 20 abi

contract ERC20PresetPausablePermissioned is
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  ERC20PermitUpgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  /**
   * @notice Role conferring the ability to pause and unpause mutable functions of the contract
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  /**
   * @notice Reserved storage slot for upgradeability
   *
   * @dev This empty reserved space is put in place to allow future versions to add new variables without shifting
   * down storage in the inheritance chain. See more [here](
   * https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)
   */
  uint256[50] private __gap; // todo add to all contracts

  /**
   * @notice An event emitted when a batch of transfers are bundled into a single transaction
   */
  event TransferredBatch(
    address[] indexed recipients,
    uint256[] indexed amounts
  );

  /**
   * @notice Batches multiple transfers into a single transaction
   *
   * @param recipients address[] list of recipient addresses
   * @param amounts uint256[] list of amounts to transfer
   *
   * Emits a TransferredBatch event.
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function batchTransfer(address[] memory recipients, uint256[] memory amounts)
    public
  {
    // todo investigate why this doesn't exist in the OZ implementation (is multicall or send a preferred alternative?)
    require(
      recipients.length == amounts.length,
      "ERC20PresetPausablePermissioned: recipient and amount length mismatch"
    );
    for (uint256 i = 0; i < recipients.length; i++) {
      transfer(recipients[i], amounts[i]);
    }
    emit TransferredBatch(recipients, amounts);
  }

  /**
   * @notice See ERC20-approve for details [here](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20-approve-address-uint256-)
   *
   * @dev This function is a wrapper around ERC20-approve.
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - Accounts cannot have allowance issued by their operators.
   * - If `value` is the maximum `uint256`, the allowance is not updated on `transferFrom`. This is semantically
   * equivalent to an infinite approval.
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
   * @notice Pauses all functions that can mutate state
   *
   * @dev Used to effectively freeze a contract so that no state updates can occur
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses **all** token transfers.
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @notice Returns the balances of a batch of addresses in a single call
   */
  function balanceOfBatch(address[] memory accounts)
    public
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](accounts.length);
    for (uint256 i = 0; i < accounts.length; ++i) {
      batchBalances[i] = balanceOf(accounts[i]);
    }
    return batchBalances;
  }

  // solhint-disable-next-line func-name-mixedcase
  function __ERC20PresetPausablePermissioned_init_unchained()
    internal
    onlyInitializing
  {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @notice Hook that is called before granting/revoking operator allowances
   *
   * @dev This overrides the behavior of `approve`, `authorizeOperator, and `revokeOperator` with pausable behavior.
   * When the contract is paused, these functions will not be callable. Follows the rules of hooks defined
   * [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function _beforeOperatorChange(address, uint256)
    internal
    virtual
    whenNotPaused
  {} // solhint-disable-line no-empty-blocks

  /**
   * @notice Hook that is called before granting/revoking roles via `grantRole`, `revokeRole`, `renounceRole`
   *
   * @dev This overrides the behavior of `_grantRole`, `_setupRole`, `_revokeRole`, and `_renounceRole` with pausable
   * behavior. When the contract is paused, these functions will not be callable. Follows the rules of hooks
   * defined [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function _beforeRoleChange(bytes32, address) internal virtual whenNotPaused {} // solhint-disable-line no-empty-blocks

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
   * @notice Grants a role to an account.
   *
   * @dev Grants `role` to `account` if the `_beforeRoleGranted` hook is satisfied
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - The requirements of _beforeRoleGranted_ must be satisfied.
   */
  function _grantRole(bytes32 role, address account) internal virtual override {
    _beforeRoleChange(role, account);
    super._grantRole(role, account);
  }

  /**
   * @notice Revokes a role from an account.
   *
   * @dev Revokes `role` from `account` if the `_beforeRoleGranted` hook is satisfied
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - The requirements of _beforeRoleGranted_ must be satisfied.
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
