/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/test.sol";
import {LockedNORILib, Schedule, Cliff} from "@/contracts/LockedNORILib.sol";

contract LockedNORILib_availableAmount is Test {
  using LockedNORILib for Schedule;

  Schedule private _schedule;

  function setUp() external {
    _schedule.startTime = block.timestamp;
    _schedule.endTime = block.timestamp + 1 weeks;
    _schedule.totalAmount = 1 ether;
    _schedule.cliffCount = 0;
    _schedule.totalCliffAmount = 0;
    vm.warp(_schedule.startTime + _schedule.endTime / 2);
  }

  function test() external {
    assertEq(
      _schedule.availableAmount(block.timestamp),
      _schedule.totalAmount / 2,
      "Incorrect avaialble amount for schedule"
    );
  }
}
