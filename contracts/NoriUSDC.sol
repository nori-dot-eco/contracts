// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./IERC20WithPermit.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract NoriUSDC is ERC20PermitUpgradeable, IERC20WithPermit {
  function initialize() public initializer {
    __ERC20Permit_init("NoriUSDC");
    __ERC20_init_unchained("NoriUSDC", "NoriUSDC");
    _mint(_msgSender(), 5_000_000_000_000_000_000_000_000_000);
  }
}
