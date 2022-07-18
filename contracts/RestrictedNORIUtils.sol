// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/** The internal governing parameters and data for a schedule */
struct Schedule {
  uint256 startTime;
  uint256 endTime;
  uint256 totalClaimedAmount;
  bool exists;
  uint256 totalQuantityRevoked;
  uint256 releasedAmountFloor;
  EnumerableSetUpgradeable.AddressSet tokenHolders;
  mapping(address => uint256) claimedAmountsByAddress;
  mapping(address => uint256) quantitiesRevokedByAddress;
}

// todo rename ScheduleLib
// todo finish fixing this documentation
/**
 * @dev Library encapsulating the logic around restriction schedules.
 *
 * All time parameters are in unixtime for ease of comparison with block.timestamp.
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
library RestrictedNORIUtils {
  /**
   * @dev The total amount of released tokens available at the current block timestamp for the schedule.
   * Takes the maximum of either the calculated linearly released amount based on the schedule parameters,
   * or the released amount floor, which is set at the current released amount whenever the balance of a
   * schedule is decreased through revocation or withdrawal.
   */
  function _releasedBalanceOfSingleSchedule(
    Schedule storage schedule,
    uint256 totalSupply
  ) internal view returns (uint256) {
    return
      MathUpgradeable.max(
        _linearReleaseAmountAvailable(schedule, totalSupply),
        schedule.releasedAmountFloor
      );
  }

  /**
   * @notice Linearly released balance for a single schedule at the current block timestamp, ignoring any
   * released amount floor that has been set for the schedule.
   */
  function _linearReleaseAmountAvailable(
    Schedule storage schedule,
    uint256 totalSupply
  ) internal view returns (uint256) {
    uint256 linearAmountAvailable = totalSupply;
    /* solhint-disable not-rely-on-time, this is time-dependent */
    if (block.timestamp < schedule.endTime) {
      uint256 rampTotalTime = schedule.endTime - schedule.startTime;
      linearAmountAvailable = block.timestamp < schedule.startTime
        ? 0
        : (_scheduleTrueTotal(schedule, totalSupply) *
          (block.timestamp - schedule.startTime)) / rampTotalTime;
    }
    /* solhint-enable not-rely-on-time */
    return linearAmountAvailable;
  }

  /**
   * @notice Reconstructs a schedule's true total based on claimed and unclaimed tokens.
   *
   * @dev claiming burns the 1155, so the true total of a schedule has to be reconstructed
   * from the totalSupply of the token and any claimed amount.
   */
  function _scheduleTrueTotal(Schedule storage schedule, uint256 totalSupply)
    internal
    view
    returns (uint256)
  {
    return schedule.totalClaimedAmount + totalSupply;
  }
}
