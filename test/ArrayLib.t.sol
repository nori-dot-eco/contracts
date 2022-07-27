/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/ArrayLib.sol";

contract ArrayLib_reference {
  using ArrayLib for uint256[];

  //todo assertions
  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](50);
    for (uint256 i = 0; i < 50; ++i) sliced[i] = normal[i];
  }

  //todo assertions
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

contract ArrayLib_slice {
  using ArrayLib for uint256[];

  //todo assertions
  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = normal.slice(0, 50);
  }
}

contract ArrayLib_range {
  using ArrayLib for uint256[];

  //todo assertions
  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory ranged = ArrayLib.range(0, 50);
  }
}

contract ArrayLib_copy {
  using ArrayLib for uint256[];

  //todo assertions
  function test() external pure {
    uint256[] memory normal = new uint256[](100);
    for (uint256 i = 0; i < 100; ++i) {
      normal[i] = i;
    }
    uint256[] memory sliced = new uint256[](100);
    normal.copy(sliced);
  }
}
