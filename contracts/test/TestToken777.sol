// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract TestToken777 is ERC777 {
  address[] ops;

  constructor() ERC777("TestToken777", "T77", ops) {
    _mint(_msgSender(), 1_000_000_000_000_000_000_000_000, "", "");
  }
}
