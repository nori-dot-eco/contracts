// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NORI is ERC777Upgradeable, OwnableUpgradeable {
  function initialize(uint256 initialSupply) public initializer {
    __Context_init_unchained();
    __ERC777_init_unchained("NORI", "NORI", new address[](0));
    _mint(msg.sender, initialSupply, "", "");
  }
}
