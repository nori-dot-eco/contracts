// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "./ERC20Preset.sol";

// todo investigate `.cap` in ERC20Capped
// todo check new erc 20 initializers are called

contract NORI is ERC20Preset {
  function initialize() public virtual initializer {
    __NORI_init();
    _mint(
      _msgSender(),
      500_000_000 * 10**18 // 500,000,000 NORI
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
    __ERC20Preset_init_unchained();
    __Multicall_init_unchained();
    __ERC20_init_unchained("NORI", "NORI");
    __ERC20Permit_init_unchained("NORI");
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
