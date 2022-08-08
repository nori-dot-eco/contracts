// SPDX-License-Identifier: MIT
pragma solidity =0.8.16;

library UInt256ArrayLib {
  function fill(uint256[] memory from, uint256 val)
    internal
    pure
    returns (uint256[] memory arr)
  {
    uint256 len = from.length;
    arr = new uint256[](len);
    assembly {
      // equivalent to `for (let i = 1; i < len + 1; i++) arr[i] = val;`
      for {
        let i := 1
      } lt(i, add(len, 1)) {
        i := add(i, 1)
      } {
        mstore(add(arr, mul(32, i)), val)
      }
    }
  }

  function sum(uint256[] memory data) internal pure returns (uint256 total) {
    assembly {
      // equivalent to `for (let i = 0; i < data.length + 1; i++) total += arr[i];`
      let len := mload(data)
      let element := add(data, 32)
      for {
        let end := add(element, mul(len, 32))
      } lt(element, end) {
        element := add(element, 32)
      } {
        total := add(total, mload(element))
      }
    }
  }

  function slice(
    uint256[] memory arr,
    uint256 from,
    uint256 to
  ) internal pure returns (uint256[] memory ret) {
    assert(from <= to);
    assert(to <= arr.length);
    assembly {
      ret := add(arr, mul(32, from))
      mstore(ret, sub(to, from))
    }
  }

  function copy(uint256[] memory from, uint256[] memory to)
    internal
    pure
    returns (uint256[] memory)
  {
    uint256 n = from.length;
    unchecked {
      for (uint256 i = 0; i < n; ++i) to[i] = from[i];
    }
    return to;
  }
}

library AddressArrayLib {
  function fill(address[] memory from, address val)
    internal
    pure
    returns (address[] memory arr)
  {
    uint256 len = from.length;
    arr = new address[](len);
    assembly {
      // equivalent to `for (let i = 1; i < len + 1; i++) arr[i] = val;`
      for {
        let i := 1
      } lt(i, add(len, 1)) {
        i := add(i, 1)
      } {
        mstore(add(arr, mul(32, i)), val)
      }
    }
  }
}
