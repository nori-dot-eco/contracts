// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

library BytesLib {
  function toAddress(bytes calldata data) internal pure returns (address addr) {
    assembly {
      addr := calldataload(data.offset)
    }
  }
}
