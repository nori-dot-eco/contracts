// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC777PresetPausablePermissioned.sol";

contract NORI is ERC777PresetPausablePermissioned {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  function initialize() public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC777PresetPausablePermissioned_init_unchained();
    _setupRole(MINTER_ROLE, _msgSender());
    __ERC777_init_unchained("NORI", "NORI", new address[](0));
    _mint(
      _msgSender(),
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
  ) public onlyRole(MINTER_ROLE) {
    _mint(account, amount, userData, operatorData);
  }
}
