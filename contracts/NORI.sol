// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC777PresetPausablePermissioned.sol";

contract NORI is ERC777PresetPausablePermissioned {
  function initialize() public initializer {
    __NORI_init();
    _mint(
      _msgSender(),
      500000000 * 10**18, // 500,000,000 NORI
      "",
      ""
    );
  }

  /**
   * @notice Initializer variant that embeds the linearized calls to all parent initializers.
   * @dev Follows the multiple inheritance initializer rules defined [here](
   * https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
   * calling two of these init functions can potentially initialize the same contract twice.
   */
  function __NORI_init() internal onlyInitializing {
    // solhint-disable-previous-line func-name-mixedcase
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC777PresetPausablePermissioned_init_unchained();
    __ERC777_init_unchained("NORI", "NORI", new address[](0));
    __NORI_init_unchained();
  }

  /**
   * @notice Initializer variant that does **not** embed linearized calls to any parent initializers.
   * @dev Follows the multiple inheritance initializer rules defined [here](
   * https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
   * calling two of these init functions can potentially initialize the same contract twice.
   */
  function __NORI_init_unchained() internal onlyInitializing {
    // solhint-disable-previous-line no-empty-blocks, func-name-mixedcase
  }
}
