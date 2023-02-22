// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "../IERC20WithPermit.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

contract MockERC20Permit is ERC20PermitUpgradeable, IERC20WithPermit {
  function initialize() public initializer {
    __ERC20Permit_init("MockERC20Permit");
    __ERC20_init_unchained("MockERC20Permit", "MERC20");
    _mint(_msgSender(), 1_000_000_000_000_000_000_000_000);
  }
}
