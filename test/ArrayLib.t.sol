/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {UInt256ArrayLib, AddressArrayLib} from "@/contracts/ArrayLib.sol";
import "@/test/helpers/test.sol";

contract UInt256ArrayLib_slice is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    uint256[] memory normal = new uint256[](100).fill(1);
    arr = new uint256[](50);
    for (uint256 i = 0; i < 50; ++i) arr[i] = normal[i + 25];
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1).slice(25, 75);
  }
}

contract UInt256ArrayLib_copy is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    uint256[] memory normal = new uint256[](100).fill(1);
    arr = new uint256[](100);
    for (uint256 i = 0; i < arr.length; ++i) arr[i] = normal[i];
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1).copy(new uint256[](100));
  }
}

contract UInt256ArrayLib_fill is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](100);
    for (uint256 i = 0; i < arr.length; ++i) arr[i] = 1;
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1);
  }
}

contract UInt256ArrayLib_sum is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_library_overflow() external {
    uint256[] memory vals = new uint256[](2);
    vals[0] = type(uint256).max;
    vals[1] = 1;
    vm.expectRevert();
    vals.sum();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function standardImplementation() external pure returns (uint256 total) {
    uint256[] memory normal = new uint256[](100).fill(1);
    for (uint256 i = 0; i < normal.length; ++i) total += normal[i];
  }

  function libraryImplementation() external pure returns (uint256) {
    return new uint256[](100).fill(1).sum();
  }
}

contract AddressArrayLib_fill is Global {
  using AddressArrayLib for address[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (address[] memory arr)
  {
    arr = new address[](100);
    for (uint256 i = 0; i < arr.length; ++i) arr[i] = address(0);
  }

  function libraryImplementation() external pure returns (address[] memory) {
    return new address[](100).fill(address(0));
  }
}
