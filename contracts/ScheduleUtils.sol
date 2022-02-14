// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

struct Cliff {
  uint256 time;
  uint256 amount;
}

struct Schedule {
  uint256 startTime;
  uint256 endTime;
  uint256 totalAmount;
  mapping(uint256 => Cliff) cliffs;
  uint256 cliffCount;
}

/**
 * @dev Library encapsulating the logic around timed release schedules with cliffs.
 *
 * Supports an arbitrary number of stepwise cliff releases beyond which the remaining
 * amount is released linearly from the time of the final cliff to the end date.
 *
 * All time parameters are in unixtime for ease of comparison with block.timestamp
 * although all methods on ScheduleUtils take *atTime* as a parameter and do not
 * directly reason about the current block timestamp.
 *
 * See also {ScheduleTestHarness.sol} for a simple use of this library
 * for unit testing purposes.
 *
 * NOTE: All methods are internal so this library gets inlined into the consuming
 * contract and does not need to be deployed separately.
 *
 * Designed to be used i.e.:
 *
 * ```
 *  using ScheduleUtils for Schedule;
 *
 *  mapping(address => Schedule) schedules = Schedules;
 *  Schedule s = schedules[account];
 *  s.startTime = 1644436100;
 *  s.endTime = 1645436100;
 *  s.totalAmount = 1000000;
 *  s.addCliff(1644436200, 50000);
 *  s.amountAvailable(1644436200);
 * ```
 *
 */
library ScheduleUtils {
  /**
   * @dev Adds a cliff defined by *time* and *amount* to *schedule*
   *
   * *time* must be >= any existing cliff, >= schedule.startTime and <= schedule.endTime
   * *amount* must be <= (schedule.totalAmount - total of existing cliffs)
   */
  function addCliff(
    Schedule storage schedule,
    uint256 time,
    uint256 amount
  ) internal {
    if (schedule.cliffCount == 0) {
      require(time >= schedule.startTime, "Cliff before schedule start");
    } else {
      require(
        time >= schedule.cliffs[schedule.cliffCount - 1].time,
        "Cliffs not chronological"
      );
    }
    require(time <= schedule.endTime, "Cliffs cannot end after schedule");
    require(
      allCliffAmounts(schedule) + amount <= schedule.totalAmount,
      "cliff amounts exceed total"
    );
    schedule.cliffs[schedule.cliffCount].time = time;
    schedule.cliffs[schedule.cliffCount].amount = amount;
    schedule.cliffCount += 1;
  }

  /**
   * @dev The sum of all cliff amounts in *schedule*
   */
  function allCliffAmounts(Schedule storage schedule)
    internal
    view
    returns (uint256)
  {
    uint256 cliffAmounts;
    for (uint256 i = 0; i < schedule.cliffCount; i++) {
      cliffAmounts += schedule.cliffs[i].amount;
    }
    return cliffAmounts;
  }

  /**
   * @dev The total of unlocked cliff amounts in *schedule* at time *atTime*
   */
  function cliffAmountsAvailable(Schedule storage schedule, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    uint256 available = 0;
    for (uint256 i = 0; i < schedule.cliffCount; i++) {
      if (atTime >= schedule.cliffs[i].time) {
        available += schedule.cliffs[i].amount;
      }
    }
    return MathUpgradeable.min(schedule.totalAmount, available);
  }

  /**
   * @dev The total amount of the linear (post-cliff) release available at *atTime*
   *
   * Will always be zero prior to the final cliff time and then increases linearly
   * util *schedule.endTime*.
   */
  function linearReleaseAmountAvailable(
    Schedule storage schedule,
    uint256 atTime
  ) internal view returns (uint256) {
    uint256 rampTotalAmount;
    // could happen if unvested tokens were revoked
    if (schedule.totalAmount >= allCliffAmounts(schedule)) {
      rampTotalAmount = schedule.totalAmount - allCliffAmounts(schedule);
    } // else 0
    if (atTime >= schedule.endTime) {
      return rampTotalAmount;
    }
    uint256 rampStartTime = schedule.startTime;
    if (schedule.cliffCount > 0) {
      rampStartTime = schedule.cliffs[schedule.cliffCount - 1].time;
    }
    uint256 rampTotalTime = schedule.endTime - rampStartTime;
    int256 rampTimeElapsed = int256(atTime) - int256(rampStartTime);
    return
      rampTimeElapsed <= 0
        ? 0
        : (rampTotalAmount * uint256(rampTimeElapsed)) / rampTotalTime;
  }

  /**
   * @dev The total amount available at *atTime*
   *
   * Will always be zero prior to *schedule.startTime* and *amount*
   * after *schedule.endTime*.
   *
   * Equivalent to cliffAmountsAvailable + linearReleaseAmountAvailable.
   */
  function availableAmount(Schedule storage schedule, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    return
      cliffAmountsAvailable(schedule, atTime) +
      linearReleaseAmountAvailable(schedule, atTime);
  }
}
