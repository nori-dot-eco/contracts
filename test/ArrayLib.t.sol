/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/ArrayLib.sol";

contract ArrayLib {
  using ArrayLib for uint256[];

  //todo assertions

  function test_reference() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    for (uint256 i = 0; i < 50; ++i) {
      sliced[i] = i;
    }
  }

  function test_slice() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = normal.slice(0, 50);
  }

  function test_normal_unchecked() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    unchecked {
      for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
    }
  }

  function test_normal_checked() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
  }

  function test_range() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = ArrayLib.range(0, 50);
  }

  function test_copy() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = ArrayLib.copy(normal);
  }

  function test_assembly() external {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced;
    assert(0 <= 50);
    assert(50 <= normal.length);
    assembly {
      sliced := add(normal, mul(0x20, 0))
      mstore(sliced, sub(50, 0))
    }
  }

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
