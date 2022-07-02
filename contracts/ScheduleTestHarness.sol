// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import {ScheduleUtils, Schedule} from "./ScheduleUtils.sol";

/**
 * @dev Testbed contract for testing ScheduleUtils library.
 *
 * Not intended for deployment in productionish environments.
 */
contract ScheduleTestHarness {
  // todo consider TestHarness vs Mock naming convention
  // todo consider moving to mocks folder
  using ScheduleUtils for Schedule;

  mapping(uint256 => Schedule) private _schedules;
  uint256 private _scheduleCount;

  event ScheduleCreated(
    uint256 id,
    uint256 startTime,
    uint256 endTime,
    uint256 totalAmount
  );
  event CliffAdded(uint256 id, uint256 time, uint256 amount);
  event ScheduleTruncated(uint256 id, uint256 balance);

  function create(
    uint256 startTime,
    uint256 endTime,
    uint256 totalAmount
  ) public {
    Schedule storage schedule = _schedules[_scheduleCount];
    _scheduleCount += 1;
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    schedule.totalAmount = totalAmount;
    emit ScheduleCreated(_scheduleCount - 1, startTime, endTime, totalAmount);
  }

  function addCliff(
    uint256 scheduleId,
    uint256 time,
    uint256 amount
  ) public {
    _schedules[scheduleId].addCliff(time, amount);
    emit CliffAdded(_schedules[scheduleId].cliffCount - 1, time, amount);
  }

  function truncateScheduleAmount(uint256 scheduleId, uint256 atTime) public {
    uint256 currentlyAvailable = availableAmount(scheduleId, atTime);
    _schedules[scheduleId].totalAmount = currentlyAvailable;
    emit ScheduleTruncated(scheduleId, currentlyAvailable);
  }

  function availableAmount(uint256 scheduleId, uint256 atTime)
    public
    view
    returns (uint256)
  {
    return _schedules[scheduleId].availableAmount(atTime);
  }
}
