/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import {UInt256ArrayLib} from "@/contracts/ArrayLib.sol";

// todo assertions
contract UInt256ArrayLib_reference {
  using UInt256ArrayLib for uint256[];

  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
  }

  function test_unchecked() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    unchecked {
      for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
    }
  }
}

contract UInt256ArrayLib_slice {
  using UInt256ArrayLib for uint256[];

  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = normal.slice(0, 50);
  }
}

contract UInt256ArrayLib_range {
  using UInt256ArrayLib for uint256[];

  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory ranged = UInt256ArrayLib.range(0, 50);
  }
}

contract UInt256ArrayLib_copy {
  using UInt256ArrayLib for uint256[];

  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](100);
    normal.copy(sliced);
  }
}
