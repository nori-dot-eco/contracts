// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

library ArrayLib {
  function range(uint256 from, uint256 to)
    internal
    pure
    returns (uint256[] memory ret)
  {
    assert(from <= to);
    unchecked {
      ret = new uint256[](to - from);
      for (uint256 i; i < to - from; ++i) ret[i] = from + i;
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
      ret := add(arr, mul(0x20, from))
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
