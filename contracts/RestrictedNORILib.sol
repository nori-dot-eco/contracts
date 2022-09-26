// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./Errors.sol";

/**
 * @notice The internal governing parameters and data for a RestrictedNORI schedule.
 */
struct Schedule {
  uint256 startTime;
  uint256 endTime;
  uint256 totalClaimedAmount;
  uint256 totalQuantityRevoked;
  uint256 releasedAmountFloor;
  EnumerableSetUpgradeable.AddressSet tokenHolders;
  mapping(address => uint256) claimedAmountsByAddress;
  mapping(address => uint256) quantitiesRevokedByAddress;
}

/**
 * @title Library encapsulating the logic around restriction schedules.
 *
 * @author Nori Inc.
 *
 * @notice
 *
 * ##### Behaviors and features:
 *
 * ###### Time
 *
 * All time parameters are in unix time for ease of comparison with `block.timestamp`.
 *
 * ##### Uses:
 *
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 * for `EnumerableSetUpgradeable.UintSet`
 * - RestrictedNORILib for `Schedule`
 */
library RestrictedNORILib {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using RestrictedNORILib for Schedule;

  /**
   * @dev The total amount of released tokens available at the current block timestamp for the schedule.
   * Takes the maximum of either the calculated linearly released amount based on the schedule parameters,
   * or the released amount floor, which is set at the current released amount whenever the balance of a
   * schedule is decreased through revocation or withdrawal.
   */
  function releasedBalanceOfSingleSchedule(
    Schedule storage schedule,
    uint256 totalSupply
  ) internal view returns (uint256) {
    return
      MathUpgradeable.max(
        schedule.linearReleaseAmountAvailable(totalSupply),
        schedule.releasedAmountFloor
      );
  }

  /**
   * @notice Linearly released balance for a single schedule at the current block timestamp, ignoring any
   * released amount floor that has been set for the schedule.
   */
  function linearReleaseAmountAvailable(
    Schedule storage schedule,
    uint256 totalSupply
  ) internal view returns (uint256) {
    uint256 linearAmountAvailable;
    /* solhint-disable not-rely-on-time, this is time-dependent */
    if (block.timestamp >= schedule.endTime) {
      linearAmountAvailable = schedule.scheduleTrueTotal(totalSupply);
    } else {
      uint256 rampTotalTime = schedule.endTime - schedule.startTime;
      linearAmountAvailable = block.timestamp < schedule.startTime
        ? 0
        : (schedule.scheduleTrueTotal(totalSupply) *
          (block.timestamp - schedule.startTime)) / rampTotalTime;
    }
    /* solhint-enable not-rely-on-time */
    return linearAmountAvailable;
  }

  /**
   * @notice Reconstructs a schedule's true total based on claimed and unclaimed tokens.
   *
   * @dev Claiming burns the ERC1155 token, so the true total of a schedule has to be reconstructed
   * from the `totalSupply` and any claimed amount.
   */
  function scheduleTrueTotal(Schedule storage schedule, uint256 totalSupply)
    internal
    view
    returns (uint256)
  {
    return schedule.totalClaimedAmount + totalSupply;
  }

  /**
   * @notice Released balance less the total claimed amount at current block timestamp for a schedule.
   */
  function claimableBalanceForSchedule(
    Schedule storage schedule,
    uint256 scheduleId,
    uint256 totalSupply
  ) internal view returns (uint256) {
    if (!schedule.doesExist()) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    return
      schedule.releasedBalanceOfSingleSchedule(totalSupply) -
      schedule.totalClaimedAmount;
  }

  /**
   * @notice A single account's claimable balance at current `block.timestamp` for a schedule.
   *
   * @dev Calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   */
  function claimableBalanceForScheduleForAccount(
    Schedule storage schedule,
    uint256 scheduleId,
    address account,
    uint256 totalSupply,
    uint256 balanceOfAccount
  ) internal view returns (uint256) {
    uint256 scheduleTotal = schedule.scheduleTrueTotal(totalSupply);
    uint256 claimableForAccount;
    // avoid division by or of 0
    if (scheduleTotal == 0 || balanceOfAccount == 0) {
      claimableForAccount = 0;
    } else {
      uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[
        account
      ];
      uint256 claimableBalanceForFullSchedule = schedule
        .claimableBalanceForSchedule(scheduleId, totalSupply);
      claimableForAccount =
        ((claimedAmountForAccount + balanceOfAccount) *
          (claimableBalanceForFullSchedule + schedule.totalClaimedAmount)) /
        scheduleTotal -
        claimedAmountForAccount;
    }

    return claimableForAccount;
  }

  /**
   * @notice Check the revocable balance of a schedule.
   * @return The current number of revocable tokens for a given schedule at the current block timestamp.
   */
  function revocableQuantityForSchedule(
    Schedule storage schedule,
    uint256 scheduleId,
    uint256 totalSupply
  ) internal view returns (uint256) {
    if (!schedule.doesExist()) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    return
      schedule.scheduleTrueTotal(totalSupply) -
      schedule.releasedBalanceOfSingleSchedule(totalSupply);
  }

  /**
   * @notice Check if a schedule exists.
   * @return True if the schedule exists, false otherwise.
   */
  function doesExist(Schedule storage schedule) internal view returns (bool) {
    return schedule.endTime != 0;
  }
}
