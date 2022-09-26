// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

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
  uint256 totalCliffAmount;
}

/**
 * @notice Library encapsulating the logic around timed release schedules with cliffs.
 *
 * @dev Supports an arbitrary number of stepwise cliff releases beyond which the remaining amount is released linearly
 * from the time of the final cliff to the end date.
 *
 * All time parameters are in unix time for ease of comparison with `block.timestamp` although all methods on
 * LockedNORILib take `atTime` as a parameter and do not directly reason about the current `block.timestamp`.
 */
library LockedNORILib {
  /**
   * @dev Add a cliff defined by the time and amount to the schedule.
   *
   * @param time must be >= any existing cliff, >= `schedule.startTime and` <= `schedule.endTime`
   * @param amount must be <= (`schedule.totalAmount` - total of existing cliffs)
   */
  function addCliff(
    Schedule storage schedule,
    uint256 time,
    uint256 amount
  ) internal {
    uint256 cliffCount = schedule.cliffCount;
    if (schedule.cliffCount == 0) {
      require(
        time >= schedule.startTime,
        "LockedNORILib: Cliff before schedule start"
      );
    } else {
      require(
        time >= schedule.cliffs[cliffCount - 1].time,
        "LockedNORILib: Cliffs not chronological"
      );
    }
    require(
      time <= schedule.endTime,
      "LockedNORILib: Cliffs cannot end after schedule" // todo Use custom errors
    );
    require(
      schedule.totalCliffAmount + amount <= schedule.totalAmount,
      "LockedNORILib: Cliff amounts exceed total"
    );
    Cliff storage cliff = schedule.cliffs[cliffCount];
    cliff.time = time;
    cliff.amount = amount;
    schedule.cliffCount += 1;
    schedule.totalCliffAmount += amount;
  }

  /**
   * @dev The total of unlocked cliff amounts in `schedule` at time `atTime`
   */
  function cliffAmountsAvailable(Schedule storage schedule, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    uint256 available = 0;
    uint256 cliffCount = schedule.cliffCount;
    for (uint256 i = 0; i < cliffCount; i++) {
      if (atTime >= schedule.cliffs[i].time) {
        available += schedule.cliffs[i].amount;
      }
    }
    return MathUpgradeable.min(schedule.totalAmount, available);
  }

  /**
   * @dev The total amount of the linear (post-cliff) release available at `atTime`
   *
   * Will always be zero prior to the final cliff time and then increases linearly
   * until `schedule.endTime`.
   */
  function linearReleaseAmountAvailable(
    Schedule storage schedule,
    uint256 atTime
  ) internal view returns (uint256) {
    uint256 rampTotalAmount;
    // could happen if unvested tokens were revoked
    if (schedule.totalAmount >= schedule.totalCliffAmount) {
      rampTotalAmount = schedule.totalAmount - schedule.totalCliffAmount;
    } // else 0
    if (atTime >= schedule.endTime) {
      return rampTotalAmount;
    }
    uint256 rampStartTime = schedule.startTime;
    if (schedule.cliffCount > 0) {
      rampStartTime = schedule.cliffs[schedule.cliffCount - 1].time;
    }
    uint256 rampTotalTime = schedule.endTime - rampStartTime;
    return
      atTime < rampStartTime
        ? 0
        : (rampTotalAmount * (atTime - rampStartTime)) / rampTotalTime;
  }

  /**
   * @dev The total amount available at `atTime`
   *
   * Will always be zero prior to `schedule.startTime` and `amount`
   * after `schedule.endTime`.
   *
   * Equivalent to `cliffAmountsAvailable + linearReleaseAmountAvailable`.
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
