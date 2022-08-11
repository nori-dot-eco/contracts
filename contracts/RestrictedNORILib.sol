// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./Errors.sol";

/** The internal governing parameters and data for a schedule */
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

// todo Finish RestrictedNORILib docs
/**
 * @dev Library encapsulating the logic around restriction schedules.
 *
 * All time parameters are in unixtime for ease of comparison with block.timestamp.
 *
 * NOTE: All methods are internal so this library gets inlined into the consuming
 * contract and does not need to be deployed separately.
 *
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
  function _releasedBalanceOfSingleSchedule(
    Schedule storage schedule,
    uint256 totalSupply
  ) internal view returns (uint256) {
    return
      MathUpgradeable.max(
        schedule._linearReleaseAmountAvailable(totalSupply),
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
    uint256 linearAmountAvailable;
    /* solhint-disable not-rely-on-time, this is time-dependent */
    if (block.timestamp >= schedule.endTime) {
      linearAmountAvailable = totalSupply;
    } else {
      uint256 rampTotalTime = schedule.endTime - schedule.startTime;
      linearAmountAvailable = block.timestamp < schedule.startTime
        ? 0
        : (schedule._scheduleTrueTotal(totalSupply) *
          (block.timestamp - schedule.startTime)) / rampTotalTime;
    }
    /* solhint-enable not-rely-on-time */
    return linearAmountAvailable;
  }

  /**
   * @notice Reconstructs a schedule's true total based on claimed and unclaimed tokens.
   *
   * @dev claiming burns the ERC1155 token, so the true total of a schedule has to be reconstructed
   * from the `totalSupply` and any claimed amount.
   */
  function _scheduleTrueTotal(Schedule storage schedule, uint256 totalSupply)
    internal
    view
    returns (uint256)
  {
    return schedule.totalClaimedAmount + totalSupply;
  }

  /**
   * @notice Released balance less the total claimed amount at current block timestamp for a schedule.
   */
  function _claimableBalanceForSchedule(
    Schedule storage schedule,
    uint256 scheduleId,
    uint256 totalSupply
  ) internal view returns (uint256) {
    if (!schedule._doesExist()) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    return
      schedule._releasedBalanceOfSingleSchedule(totalSupply) -
      schedule.totalClaimedAmount;
  }

  /**
   * @notice A single account's claimable balance at current block timestamp for a schedule
   *
   * @dev calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   */
  function _claimableBalanceForScheduleForAccount(
    Schedule storage schedule,
    uint256 scheduleId,
    address account,
    uint256 totalSupply,
    uint256 balanceOfAccount
  ) internal view returns (uint256) {
    uint256 scheduleTrueTotal = schedule._scheduleTrueTotal(totalSupply);
    uint256 claimableForAccount;
    // avoid division by or of 0
    if (scheduleTrueTotal == 0 || balanceOfAccount == 0) {
      claimableForAccount = 0;
    } else {
      uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[
        account
      ];
      uint256 claimableBalanceForFullSchedule = schedule
        ._claimableBalanceForSchedule(scheduleId, totalSupply);
      claimableForAccount =
        ((claimedAmountForAccount + balanceOfAccount) *
          (claimableBalanceForFullSchedule + schedule.totalClaimedAmount)) /
        scheduleTrueTotal -
        claimedAmountForAccount;
    }

    return claimableForAccount;
  }

  /**
   * @notice Returns the current number of revocable tokens for a given schedule at the current block timestamp.
   */
  function _revocableQuantityForSchedule(
    Schedule storage schedule,
    uint256 scheduleId,
    uint256 totalSupply
  ) internal view returns (uint256) {
    if (!schedule._doesExist()) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    return
      schedule._scheduleTrueTotal(totalSupply) -
      schedule._releasedBalanceOfSingleSchedule(totalSupply);
  }

  /**
   * @notice Returns the existence of a schedule
   */
  function _doesExist(Schedule storage schedule) internal view returns (bool) {
    return schedule.endTime != 0;
  }
}
