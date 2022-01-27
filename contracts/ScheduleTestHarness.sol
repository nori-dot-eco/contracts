// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import { ScheduleUtils, Schedule } from "./ScheduleUtils.sol";

// @dev Testbed contract for testing ScheduleUtils library.
// Not intended for deployment in productionish environments.

contract ScheduleTestHarness {
  using ScheduleUtils for Schedule;

  event ScheduleCreated(
    uint256 id,
    uint256 startTime,
    uint256 endTime,
    uint256 totalAmount
  );
  event CliffAdded(uint256 id, uint256 time, uint256 amount);
  event ScheduleTruncated(uint256 id, uint256 balance);

  mapping(uint256 => Schedule) schedules;
  uint256 scheduleCount;

  function create(
    uint256 startTime,
    uint256 endTime,
    uint256 totalAmount
  ) public {
    Schedule storage schedule = schedules[scheduleCount];
    scheduleCount += 1;
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    schedule.totalAmount = totalAmount;
    emit ScheduleCreated(scheduleCount - 1, startTime, endTime, totalAmount);
  }

  function addCliff(
    uint256 scheduleId,
    uint256 time,
    uint256 amount
  ) public {
    schedules[scheduleId].addCliff(time, amount);
    emit CliffAdded(schedules[scheduleId].cliffCount - 1, time, amount);
  }

  function truncateScheduleAmount(uint256 scheduleId, uint256 atTime) public {
    uint256 currentlyAvailable = availableAmount(scheduleId, atTime);
    schedules[scheduleId].totalAmount = currentlyAvailable;
    emit ScheduleTruncated(scheduleId, currentlyAvailable);
  }

  function availableAmount(uint256 scheduleId, uint256 atTime)
    public
    view
    returns (uint256)
  {
    return schedules[scheduleId].availableAmount(atTime);
  }
}
