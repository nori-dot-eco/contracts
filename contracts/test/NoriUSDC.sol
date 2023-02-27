// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "../IERC20WithPermit.sol";
import "../ERC20Preset.sol";

contract NoriUSDC is ERC20Preset {
  function initialize(address mintee) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __EIP712_init_unchained({name: "NoriUSDC", version: "1"});
    __ERC20_init_unchained({name_: "NoriUSDC", symbol_: "NORIUSDC"});
    __ERC20Permit_init_unchained("NORIUSDC");
    __ERC20Burnable_init_unchained();
    __ERC20Preset_init_unchained();
    __Multicall_init_unchained();
    _mint({account: mintee, amount: 500_000_000_000 ether});
  }

  function decimals() public view virtual override returns (uint8) {
    return 6;
  }
}
