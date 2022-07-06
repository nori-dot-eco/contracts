// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "forge-std/Test.sol";

contract RemovalTest is Test {
  uint256 testNumber;

  function setUp() public {
    testNumber = 42;
  }

  function testNumberIs42() public {
    assertEq(testNumber, 42);
  }

  function testFailSubtract43() public {
    testNumber -= 43;
  }
}
