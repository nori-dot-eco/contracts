// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

// todo rename Uint256ArrayLib
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

  function fill(uint256[] memory arr, uint256 val)
    internal
    pure
    returns (uint256[] memory)
  {
    return _fill(arr, new uint256[](arr.length), val);
  }

  function _fill(
    uint256[] memory from,
    uint256[] memory to,
    uint256 val
  ) internal pure returns (uint256[] memory) {
    uint256 n = from.length;
    unchecked {
      for (uint256 i = 0; i < n; ++i) to[i] = val;
    }
    return to;
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

  function toMemory(uint256[3] memory arr)
    internal
    pure
    returns (uint256[] memory out)
  {
    unchecked {
      out = new uint256[](3);
      for (uint256 i; i < 3; ++i) out[i] = arr[i];
    }
  }
}

library AddressArrayLib {
  // function fill(address[] memory arr, address val)
  //   internal
  //   pure
  //   returns (address[] memory ret)
  // {
  //   uint256 n = arr.length;
  //   unchecked {
  //     for (uint256 i; i < n; ++i) ret[i] = val;
  //   }
  //   return ret;
  // }

  function fill(address[] memory arr, address val)
    internal
    pure
    returns (address[] memory)
  {
    return _fill(arr, new address[](arr.length), val);
  }

  function _fill(
    address[] memory from,
    address[] memory to,
    address val
  ) internal pure returns (address[] memory) {
    uint256 n = from.length;
    unchecked {
      for (uint256 i = 0; i < n; ++i) to[i] = val;
    }
    return to;
  }
}
