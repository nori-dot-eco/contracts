// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

contract AccessPresetPausable is
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  /**
   * @notice Role conferring pausing and unpausing of this contract.
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  /**
   * @notice Pauses all functions that can mutate state.
   *
   * @dev Used to effectively freeze a contract so that no state updates can occur.
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses all token transfers.
   *
   * @dev Re-enables functionality that was paused by `pause`.
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @notice Grants a role to an account.
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function _grantRole(bytes32 role, address account)
    internal
    virtual
    override
    whenNotPaused
  {
    super._grantRole(role, account);
  }

  /**
   * @notice Revokes a role from an account.
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   */
  function _revokeRole(bytes32 role, address account)
    internal
    virtual
    override
    whenNotPaused
  {
    super._revokeRole(role, account);
  }
}
