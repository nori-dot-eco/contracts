// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

/**
 * @title A library for working with bytes
 *
 * @author Nori Inc.
 *
 * @notice This library provides helper functions for working with bytes.
 *
 * @dev The methods in this library provide wrappers around the solidity `bytes` type.
 */
library BytesLib {
  /**
   * @notice Casts bytes to an address.
   * @dev Uses `calldataload` and a return type of `address` to cast the input `bytes calldata` to an address. This is
   * primarily useful to bypass the need to use `abi.decode(data, (address))` when `data` is always expected to contain
   * an encoded address and nothing more.
   * @param data The bytes to cast to an address.
   * @return addr The bytes casted as an address.
   */
  function toAddress(bytes calldata data) internal pure returns (address addr) {
    assembly {
      addr := calldataload(data.offset)
    }
  }
}
