// SPDX-License-Identifier: MIT
pragma solidity =0.8.16;

import "./ERC20Preset.sol";

// todo Security audit item: https://github.com/nori-dot-eco/contracts/security/code-scanning/499
contract NORI is ERC20Preset {
  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external virtual initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __EIP712_init_unchained("NORI", "1");
    __ERC20_init_unchained("NORI", "NORI");
    __ERC20Permit_init_unchained("NORI");
    __ERC20Burnable_init_unchained();
    __ERC20Preset_init_unchained();
    __Multicall_init_unchained();
    _mint(_msgSender(), 500_000_000 ether);
  }
}
