// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ScheduleUtils {
  struct Cliff {
    uint256 time;
    uint256 amount;
  }

  struct Schedule {
    uint256 startTime;
    uint256 endTime;
    uint256 totalAmount;
    // mapping(uint256 => Cliff) cliffs;
    uint256 cliffCount;
  }

  //   function addCliff(
  //     Schedule storage schedule,
  //     uint256 time,
  //     uint256 amount
  //   ) public {
  //     if (schedule.cliffCount == 0) {
  //       require(time >= schedule.startTime, "Cliff before schedule start");
  //     } else {
  //       require(
  //         time >= schedule.cliffs[schedule.cliffCount - 1].time,
  //         "Cliffs not chronological"
  //       );
  //     }
  //     require(time < schedule.endTime, "Cliffs cannot end after schedule");
  //     require(
  //       allCliffAmounts(schedule) + amount <= schedule.totalAmount,
  //       "cliff amounts exceed total"
  //     );
  //     schedule.cliffs[schedule.cliffCount].time = time;
  //     schedule.cliffs[schedule.cliffCount].amount = amount;
  //     schedule.cliffCount += 1;
  //   }

  function allCliffAmounts(Schedule storage schedule)
    private
    view
    returns (uint256)
  {
    uint256 cliffAmounts;
    // for (uint256 i = 0; i < schedule.cliffCount; i++) {
    //   cliffAmounts += schedule.cliffs[i].amount;
    // }
    return cliffAmounts;
  }

  function cliffAmountsAvailable(Schedule storage schedule, uint256 atTime)
    private
    view
    returns (uint256)
  {
    uint256 available = 0;
    // for (uint256 i = 0; i < schedule.cliffCount; i++) {
    //   if (atTime >= schedule.cliffs[i].time) {
    //     available += schedule.cliffs[i].amount;
    //   }
    // }
    return available;
  }

  function linearReleaseAmountAvailable(
    Schedule storage schedule,
    uint256 atTime
  ) private view returns (uint256) {
    uint256 rampTotalAmount = schedule.totalAmount - allCliffAmounts(schedule);
    if (atTime >= schedule.endTime) {
      return rampTotalAmount;
    }
    uint256 rampStartTime = schedule.startTime;
    // if (schedule.cliffCount > 0) {
    //   rampStartTime = schedule.cliffs[schedule.cliffCount - 1].time;
    // }
    uint256 rampTotalTime = schedule.endTime - rampStartTime;
    int256 rampTimeElapsed = int256(atTime) - int256(rampStartTime);
    return
      rampTimeElapsed <= 0
        ? 0
        : (rampTotalAmount * uint256(rampTimeElapsed)) / rampTotalTime;
  }

  function availableAmount(Schedule storage schedule, uint256 atTime)
    public
    view
    returns (uint256)
  {
    return
      cliffAmountsAvailable(schedule, atTime) +
      linearReleaseAmountAvailable(schedule, atTime);
  }
}