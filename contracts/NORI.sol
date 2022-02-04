// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

// todo restrict all functions (whenNotPaused modifier)
// todo restrict burning
// todo inherit ERC20PresetMinterPauserUpgradeable isnstead of using custom pausable logic
contract NORI is
  ERC777Upgradeable,
  AccessControlEnumerableUpgradeable,
  PausableUpgradeable
{
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  function initialize() public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC777_init_unchained("NORI", "NORI", new address[](0));
    __Pausable_init_unchained();
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
    _mint(
      msg.sender,
      500000000 * 10**18, // 500,000,000 NORI
      "",
      ""
    );
  }

  /**
   * @dev Creates `amount` new tokens for `account`.
   *
   * Requirements:
   *
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(
    address account,
    uint256 amount,
    bytes memory userData,
    bytes memory operatorData
  ) public {
    require(hasRole(MINTER_ROLE, _msgSender()), "NORI: missing MINTER_ROLE");
    _mint(account, amount, userData, operatorData);
  }

  /**
   * @dev Pauses all token transfers.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function pause() public {
    require(hasRole(PAUSER_ROLE, _msgSender()), "NORI: missing PAUSER_ROLE");
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function unpause() public {
    require(hasRole(PAUSER_ROLE, _msgSender()), "NORI: missing PAUSER_ROLE"); // todo isPauser modifier
    _unpause();
  }

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
  ) internal override {
    super._beforeTokenTransfer(operator, from, to, amount);
    require(!paused(), "NORI: contract is paused");
  }
}
