// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

// import "forge-std/console2.sol"; // todo

// todo docs
contract PausableAccessPreset is
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  /**
   * @notice Role conferring pausing and unpausing of this contract.
   *
   * @dev Only a Nori admin address should have this role.
   */
  bytes32 public immutable PAUSER_ROLE = keccak256("PAUSER_ROLE"); // solhint-disable-line var-name-mixedcase

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
   * @dev
   *
   * ##### Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
  }
}
