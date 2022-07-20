/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  using ArrayUtils for uint256[];

  // function test_normal() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = new uint256[](50);
  //   for (uint256 i = 0; i < 50; ++i) {
  //     sliced[i] = i;
  //   }
  // }

  // function test_slice() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = normal.slice(0, 50);
  // }

  // function test_normal_unchecked() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = new uint256[](50);
  //   unchecked {
  //     for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
  //   }
  // }

  // function test_normal_checked() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = new uint256[](50);
  //   for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
  // }

  // function test_range() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = ArrayUtils.range(0, 50);
  // }

  // function test_copy() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced = ArrayUtils.copy(normal);
  // }

  // function test_assembly() external {
  //   uint256[] memory normal = new uint256[](100);
  //   for (uint256 i = 0; i < 100; ++i) {
  //     normal[i] = i;
  //   }
  //   uint256[] memory sliced;
  //   assert(0 <= 50);
  //   assert(50 <= normal.length);
  //   assembly {
  //     sliced := add(normal, mul(0x20, 0))
  //     mstore(sliced, sub(50, 0))
  //   }
  // }

  function test_assembly_dangerous() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced;
    assembly {
      sliced := add(normal, mul(0x20, 0))
      mstore(sliced, sub(50, 0))
    }
  }
}

library ArrayUtils {
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
    uint256 n = to - from;
    ret = new uint256[](n);
    unchecked {
      for (uint256 i = 0; i < n; ++i) ret[i] = arr[from + i];
    }
  }

  function _slice(
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

  function copy(uint256[] memory arr) internal pure returns (uint256[] memory) {
    return _copy(arr, new uint256[](arr.length));
  }

  function _copy(uint256[] memory from, uint256[] memory to)
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
