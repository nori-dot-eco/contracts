// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC777/presets/ERC777PresetFixedSupplyUpgradeable.sol";

contract MockERC777 is ERC777PresetFixedSupplyUpgradeable {
  function initialize() public initializer {
    address[] memory ops;
    __ERC777PresetFixedSupply_init(
      "MockERC777",
      "MERC77",
      ops,
      1_000_000_000_000_000_000_000_000,
      _msgSender()
    );
  }
}
