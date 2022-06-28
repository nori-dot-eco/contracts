// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./ERC20Preset.sol";

contract NORI is ERC20Preset {
  function initialize() external virtual initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC20Preset_init_unchained();
    __Multicall_init_unchained();
    __ERC20_init_unchained("NORI", "NORI");
    __EIP712_init_unchained("NORI", "1");
    __ERC20Permit_init_unchained("NORI");
    __ERC20Burnable_init_unchained();
    __Multicall_init_unchained();
    __ERC20Preset_init_unchained();
    _mint(
      _msgSender(),
      500_000_000 * 10**uint256(decimals()) // 500,000,000 NORI
    );
  }
}
